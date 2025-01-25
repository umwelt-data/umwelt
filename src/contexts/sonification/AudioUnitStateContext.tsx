import { createContext, useContext, ParentProps, createMemo, createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';
import { AudioEncoding, audioPropNames, AudioUnitSpec, UmweltDataset, UmweltPredicate, UmweltValue } from '../../types';
import { LogicalAnd } from 'vega-lite/src/logical';
import { getFieldDef, resolveFieldDef } from '../../util/spec';
import { serializeValue } from '../../util/values';
import { selectionTest } from '../../util/selection';
import { useUmweltSpec } from '../UmweltSpecContext';
import { FieldEqualPredicate } from 'vega-lite/src/predicate';
import { getBinnedDomain, getDomain } from '../../util/domain';
import fastCartesian from 'fast-cartesian';
import { SonifierNote, useAudioEngine } from './AudioEngineContext';
import { useSonificationState } from './SonificationStateContext';
import { encodeProperty } from '../../util/encoding';
import { useAudioScales } from './AudioScalesContext';
import { derivedDataset, derivedFieldName } from '../../util/transforms';
import { describeField, fmtValue } from '../../util/description';

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
  getDerivedData: () => UmweltDataset;
  setupTransportSequence: () => void;
  resetTraversalIfEnd: () => void;
  describePlaybackOrder: () => string;
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
  const [spec] = useUmweltSpec();
  const [scales, scaleActions] = useAudioScales();
  const [sonificationState, sonificationStateActions] = useSonificationState();
  const [audioEngine, audioEngineActions] = useAudioEngine();

  const getInitialState = (): AudioUnitState => {
    return {
      traversalState: Object.fromEntries(
        props.audioUnitSpec.traversal.map((traversalFieldDef) => {
          return [traversalFieldDef.field, 0];
        })
      ),
    };
  };

  const [audioUnitState, setAudioUnitState] = createStore(getInitialState());

  // derived state
  const getResolvedFields = createMemo(() => {
    return spec.fields.map((fieldDef) => {
      const encFieldDef = Object.values(props.audioUnitSpec.encoding).find((f) => f.field === fieldDef.name) || props.audioUnitSpec.traversal.find((f) => f.field === fieldDef.name);
      return resolveFieldDef(fieldDef, encFieldDef);
    });
  });
  const getDerivedData = createMemo(() => {
    const data = derivedDataset(spec.data.values, getResolvedFields()); // TODO global selection
    return data;
  });
  const getFieldDomains = createMemo(() => {
    return Object.fromEntries(
      props.audioUnitSpec.traversal.map((traversalFieldDef) => {
        const fieldDef = getFieldDef(spec, traversalFieldDef.field)!;
        const resolvedFieldDef = resolveFieldDef(fieldDef, traversalFieldDef);
        const domain = getDomain(resolvedFieldDef, getDerivedData(), true);
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
        audioEngineActions.playNote(note);
      }
    },
    getTraversalIndex: (field) => {
      return audioUnitState.traversalState[field];
    },
    setupTransportSequence: () => {
      if (sonificationState.activeUnitName !== props.audioUnitSpec.name) {
        // update active unit
        sonificationStateActions.setActiveUnit(props.audioUnitSpec.name);
        // Clear previous sequence
        audioEngine.transport.cancel();

        const notes = getSonifierNotes();

        // Schedule notes in the transport
        notes.forEach((note, idx) => {
          // if note.state is the same as the current traversal state, set the time to the note time
          if (Object.entries(note.state).every(([field, index]) => audioUnitState.traversalState[field] === index)) {
            audioEngine.transport.seconds = note.time;
          }

          audioEngine.transport.schedule(() => {
            if (audioEngine.isPlaying) {
              // isPlaying check needed to avoid race conditions because of async scheduling
              if (note.ramp) {
                audioEngineActions.startOrRampSynth(note);
              } else {
                audioEngineActions.playNote(note);
              }
              setAudioUnitState((prev) => {
                return { ...prev, traversalState: note.state };
              });
            }
          }, note.time);
          if (note.pauseAfter) {
            audioEngine.transport.schedule(() => {
              audioEngineActions.releaseSynth();
            }, note.time + note.duration);
          }
          // if it's the last note, pause the transport
          if (idx === notes.length - 1) {
            audioEngine.transport.schedule(() => {
              audioEngineActions.stopTransport();
            }, note.time + note.duration);
          }
        });
      }
    },
    getFieldDomains,
    getDerivedData,
    resetTraversalIfEnd: () => {
      const traversalFields = props.audioUnitSpec.traversal.map((f) => f.field);
      const traversalState = audioUnitState.traversalState;
      const traversalEnd = traversalFields.every((field) => {
        return traversalState[field] === getFieldDomains()[field].length - 1;
      });
      if (traversalEnd) {
        setAudioUnitState(getInitialState());
        audioEngine.transport.seconds = 0;
      }
    },
    describePlaybackOrder: () => {
      if (!props.audioUnitSpec.traversal.length) {
        return '';
      }

      const innerTraversal = props.audioUnitSpec.traversal[props.audioUnitSpec.traversal.length - 1];
      const fieldDef = getFieldDef(spec, innerTraversal.field);
      const resolvedDef = resolveFieldDef(fieldDef!, innerTraversal);

      let domain;
      if (resolvedDef.bin) {
        domain = getBinnedDomain(resolvedDef, getDerivedData());
        console.log('data', getDerivedData());
        console.log('domain', domain);
      } else {
        const domains = getFieldDomains();
        domain = domains[innerTraversal.field];
      }

      let label = '';

      if (domain.length > 1) {
        label = `${fmtValue(domain[0], resolvedDef)} to ${fmtValue(domain[domain.length - 1], resolvedDef)}`;
      } else if (domain.length === 1) {
        label = fmtValue(domain[0], resolvedDef);
      } else {
        label = innerTraversal.field;
      }

      const additionalFields = props.audioUnitSpec.traversal.slice(0, -1).map((t) => {
        const fieldDef = getFieldDef(spec, t.field);
        return describeField(resolveFieldDef(fieldDef!, t));
      });

      if (additionalFields.length) {
        label += ` for each ${additionalFields.join(', ')}`;
      }

      return label;
    },
  };

  const internalActions: AudioUnitStateInternalActions = {
    traversalStateToData: (traversalState: TraversalState) => {
      const predicate: LogicalAnd<FieldEqualPredicate> = {
        and: Object.entries(traversalState).map(([field, index]) => {
          const value = getFieldDomains()[field][index];
          const fieldDef = getFieldDef(spec, field);
          if (!fieldDef) {
            return {
              field,
              equal: value,
            };
          }
          const resolvedFieldDef = resolveFieldDef(fieldDef, props.audioUnitSpec.traversal.find((f) => f.field === field)!);
          const derivedField = derivedFieldName(resolvedFieldDef);
          return {
            field: derivedField,
            equal: serializeValue(value, fieldDef),
          };
        }),
      };
      const selection = selectionTest(getDerivedData(), predicate);
      return selection;
    },
    encodeDataAsNote: (data: UmweltDataset, encoding: AudioEncoding): EncodedNote => {
      const note = {
        pitch: data.length ? encodeProperty('pitch', spec, encoding.pitch, scales.pitch, data) : undefined,
        volume: encodeProperty('volume', spec, encoding.volume, scales.volume, data),
        duration: encodeProperty('duration', spec, encoding.duration, scales.duration, data),
      };
      return note;
    },
    countEndingSectionsOfState: (state: TraversalState) => {
      const traversalFields = [...props.audioUnitSpec.traversal.map((f) => f.field)];
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
    const innermostField = props.audioUnitSpec.traversal[props.audioUnitSpec.traversal.length - 1].field;
    const fieldDef = getFieldDef(spec, innermostField);
    return fieldDef?.type === 'quantitative' || fieldDef?.type === 'temporal';
  });

  const getAllTraversalStates = createMemo(() => {
    const traversalFields = [...props.audioUnitSpec.traversal.map((f) => f.field)];
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

    // const ticks = audioUnitSpec.traversal.map((traversalFieldDef) => {
    //   const fieldDef = getFieldDef(spec, traversalFieldDef.field);
    //   if (!fieldDef) {
    //     return [];
    //   }
    //   const resolvedFieldDef = resolveFieldDef(fieldDef, traversalFieldDef);
    //   scaleActions.getAxisTicks(resolvedFieldDef);
    // });

    // let prevState: TraversalState | undefined = undefined;
    allTraversalStates.forEach((state) => {
      const data = internalActions.traversalStateToData(state);
      const note = internalActions.encodeDataAsNote(data, props.audioUnitSpec.encoding);

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

      // prevState = state;
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
