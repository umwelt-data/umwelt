import { createContext, useContext, ParentProps, createMemo, createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';
import { AudioEncoding, audioPropNames, AudioUnitSpec, UmweltDataset, UmweltPredicate, UmweltValue } from '../../types';
import { LogicalAnd } from 'vega-lite/src/logical';
import { getFieldDef } from '../../util/spec';
import { serializeValue } from '../../util/values';
import { selectionTest } from '../../util/selection';
import { useUmweltSpec } from '../UmweltSpecContext';
import { FieldEqualPredicate } from 'vega-lite/src/predicate';
import { getDomain } from '../../util/domain';
import fastCartesian from 'fast-cartesian';
import { SonifierNote, useAudioEngine } from './AudioEngineContext';
import { useSonificationState } from './SonificationStateContext';
import { encodeProperty } from '../../util/encoding';
import { useAudioScales } from './AudioScalesContext';

export interface EncodedNote {
  duration: number; // duration in seconds
  pitch: number | undefined; // midi, or undefined for noise
  volume: number; // decibels
}

export type AudioUnitStateProviderProps = ParentProps<{
  audioUnitSpec: AudioUnitSpec;
}>;

export type AudioUnitStateActions = {
  setTraversalIndex: (field: string, index: number) => void;
  getTraversalIndex: (field: string) => number;
  getFieldDomains: () => Record<string, UmweltValue[]>;
  setupTransportSequence: () => void;
};

type AudioUnitStateInternalActions = {
  traversalStateToData: (state: TraversalState) => UmweltDataset;
  encodeDataAsNote: (data: UmweltDataset, encoding: AudioEncoding) => EncodedNote;
  countEndingSectionsOfState: (state: TraversalState) => number;
  getNoteFromState: (state: TraversalState) => SonifierNote | undefined;
};

export type TraversalState = Record<string, number>; // Field -> Index

export interface AudioUnitState {
  traversalState: TraversalState;
}

const AudioUnitStateContext = createContext<[AudioUnitState, AudioUnitStateActions]>();

export function AudioUnitStateProvider(props: AudioUnitStateProviderProps) {
  const { audioUnitSpec } = props;
  const [spec] = useUmweltSpec();
  const scales = useAudioScales();
  const [sonificationState, sonificationStateActions] = useSonificationState();
  const [audioEngine, audioEngineActions] = useAudioEngine();

  const getInitialState = (): AudioUnitState => {
    return {
      traversalState: Object.fromEntries(
        audioUnitSpec.traversal.map((traversalFieldDef) => {
          return [traversalFieldDef.field, 0];
        })
      ),
    };
  };

  const [audioUnitState, setAudioUnitState] = createStore(getInitialState());

  // derived state
  const getFieldDomains = createMemo(() => {
    return Object.fromEntries(
      audioUnitSpec.traversal.map((traversalFieldDef) => {
        const domain = getDomain(traversalFieldDef, spec.data.values); // todo global selection
        return [traversalFieldDef.field, domain];
      })
    );
  });

  const actions: AudioUnitStateActions = {
    setTraversalIndex: (field, index) => {
      audioEngineActions.stopTransport();
      setAudioUnitState((prev) => {
        return { ...prev, traversalState: { ...prev.traversalState, [field]: index } };
      });
      actions.setupTransportSequence();
      const note = internalActions.getNoteFromState(audioUnitState.traversalState);
      if (note) {
        audioEngine.transport.seconds = note?.time;
        // audioEngineActions.playNote(note);
      }
    },
    getTraversalIndex: (field) => {
      return audioUnitState.traversalState[field];
    },
    setupTransportSequence: () => {
      if (sonificationState.activeUnitName !== audioUnitSpec.name) {
        // update active unit
        sonificationStateActions.setActiveUnit(audioUnitSpec.name);
        // Clear previous sequence
        audioEngine.transport.cancel();

        const notes = getSonifierNotes();

        // Schedule notes in the transport
        notes.forEach((note) => {
          audioEngine.transport.schedule(() => {
            // if (note.ramp) {
            //   audioEngineActions.playRampedNote(note);
            // } else {
            //   audioEngineActions.playNote(note);
            // }
            console.log(audioEngine.isPlaying, 'playing', note.state);
            if (audioEngine.isPlaying) {
              setAudioUnitState((prev) => {
                return { ...prev, traversalState: note.state };
              });
            }
          }, note.time);
          // if (note.pauseAfter) {
          //   audioEngine.transport.schedule(() => {
          //     audioEngineActions.releaseSynth();
          //   }, note.time + note.duration);
          // }
        });

        console.log('Scheduled notes:', notes);
      }
    },
    getFieldDomains,
  };

  const internalActions: AudioUnitStateInternalActions = {
    traversalStateToData: (traversalState: TraversalState) => {
      const predicate: LogicalAnd<FieldEqualPredicate> = {
        and: Object.entries(traversalState).map(([field, index]) => {
          const value = getFieldDomains()[field][index];
          const fieldDef = getFieldDef(spec, field)!;
          return {
            field,
            equal: serializeValue(value, fieldDef),
          };
        }),
      };
      const selection = selectionTest(spec.data.values, predicate);
      return selection;
    },
    encodeDataAsNote: (data: UmweltDataset, encoding: AudioEncoding): EncodedNote => {
      const note = {
        pitch: data.length ? encodeProperty('pitch', encoding.pitch, scales.pitch, data) : undefined,
        volume: encodeProperty('volume', encoding.volume, scales.volume, data),
        duration: encodeProperty('duration', encoding.duration, scales.duration, data),
      };
      return note;
    },
    countEndingSectionsOfState: (state: TraversalState) => {
      const traversalFields = [...audioUnitSpec.traversal.map((f) => f.field)];
      const domains = getFieldDomains();
      return traversalFields.reduce((count, field) => {
        return state[field] === domains[field].length - 1 ? count + 1 : count;
      }, 0);
    },
    getNoteFromState: (state: TraversalState) => {
      const notes = getSonifierNotes();
      const note = notes.find((note) => {
        return Object.entries(state).every(([field, index]) => {
          return note.state[field] === index;
        });
      });
      return note;
    },
  };

  const shouldRamp = createMemo(() => {
    const innermostField = audioUnitSpec.traversal[audioUnitSpec.traversal.length - 1].field;
    const fieldDef = getFieldDef(spec, innermostField);
    return fieldDef?.type === 'quantitative' || fieldDef?.type === 'temporal' || fieldDef?.type === 'ordinal';
  });

  const getAllTraversalStates = createMemo(() => {
    const traversalFields = [...audioUnitSpec.traversal.map((f) => f.field)];
    const fieldDomains = getFieldDomains();

    const domainLengths = traversalFields.map((field) => Array.from({ length: fieldDomains[field].length }, (_, i) => i));

    // Generate all combinations of indices using fastCartesian
    const indexCombinations = fastCartesian(domainLengths);

    // Convert index combinations to field combinations
    return indexCombinations.map((combination) => {
      const result: TraversalState = {};
      combination.forEach((index, fieldIndex) => {
        result[traversalFields[fieldIndex]] = index;
      });
      return result;
    });
  });
  const getSonifierNotes = createMemo(() => {
    // Set up new sequence based on all possible states
    let currentTime = 0;
    const notes: SonifierNote[] = [];

    const allTraversalStates = getAllTraversalStates();

    allTraversalStates.forEach((state) => {
      const data = internalActions.traversalStateToData(state);
      const note = internalActions.encodeDataAsNote(data, audioUnitSpec.encoding);

      // Add section breaks if this state ends one or more sections
      const endingSections = internalActions.countEndingSectionsOfState(state);
      const pauseAfter = audioEngine.pauseBetweenSections * endingSections;

      // Add the note with cumulative timing
      notes.push({
        ...note,
        time: currentTime,
        pauseAfter,
        ramp: shouldRamp(),
        state,
      });

      // Update the time for the next note, including the gap
      currentTime += note.duration + pauseAfter;
    });

    return notes;
  });

  return <AudioUnitStateContext.Provider value={[audioUnitState, actions]}>{props.children}</AudioUnitStateContext.Provider>;
}

export function useAudioUnitState() {
  const context = useContext(AudioUnitStateContext);
  if (context === undefined) {
    throw new Error('useAudioUnitState must be used within a AudioUnitStateProvider');
  }
  return context;
}
