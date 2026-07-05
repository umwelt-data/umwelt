import { createContext, useContext, ParentProps, createMemo, createEffect, createSignal, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import { AudioUnitSpec, UmweltDataset, UmweltSpec, UmweltValue } from '../../types';
import { getFieldDef, resolveAudioUnitFields, resolveFieldDef } from '../../util/spec';
import { selectionTest } from '../../util/selection';
import { getDomain } from '../../util/domain';
import { DEFAULT_TONE_BPM, useAudioEngine } from './AudioEngineContext';
import { useSonificationState } from './SonificationStateContext';
import { useAudioScales } from './AudioScalesContext';
import { derivedDataset } from '../../util/transforms';
import { audioUnitFieldBins } from '../../util/ticks';
import { useUmweltSelection } from '../UmweltSelectionContext';
import {
  SonifierNote,
  SonifyContext,
  TraversalState,
  computeSonifierNotes,
  describeEncodings as describeEncodingsPure,
  describePlaybackOrder as describePlaybackOrderPure,
  getDomainValue as getDomainValuePure,
  getPredicateForState as getPredicateForStatePure,
} from '../../util/sonify';

export type { EncodedNote, TraversalState } from '../../util/sonify';

export type AudioUnitStateProviderProps = ParentProps<{
  spec: UmweltSpec;
  data: UmweltDataset;
  audioUnitSpec: AudioUnitSpec;
}>;

export type AudioUnitStateActions = {
  setTraversalIndex: (field: string, index: number) => void;
  getTraversalIndex: (field: string) => number;
  getFieldDomains: () => Record<string, UmweltValue[]>;
  getDerivedData: () => UmweltDataset;
  getDomainValue: (field: string, idx: number) => UmweltValue | [UmweltValue, UmweltValue];
  setupTransportSequence: () => void;
  resetTraversalIfEnd: () => void;
  describeEncodings: () => string;
  describePlaybackOrder: () => string;
};

export interface AudioUnitState {
  traversalState: TraversalState;
}

export const AudioUnitStateContext = createContext<[AudioUnitState, AudioUnitStateActions]>();

export function AudioUnitStateProvider(props: AudioUnitStateProviderProps) {
  const [_, umweltSelectionActions] = useUmweltSelection();
  const [scales, scaleActions] = useAudioScales();
  const [sonificationState, sonificationStateActions] = useSonificationState();
  const [audioEngine, audioEngineActions] = useAudioEngine();

  const [speechVoice, setSpeechVoice] = createSignal<SpeechSynthesisVoice | undefined>();

  const resolveVoice = () => {
    const voices = speechSynthesis.getVoices();
    const samantha = voices.find((v) => v.name === 'Samantha');
    const localDefault = voices.find((v) => v.localService && v.default);
    const anyDefault = voices.find((v) => v.default);
    setSpeechVoice(samantha ?? localDefault ?? anyDefault);
  };

  resolveVoice();
  speechSynthesis.addEventListener('voiceschanged', resolveVoice);
  onCleanup(() => speechSynthesis.removeEventListener('voiceschanged', resolveVoice));

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
    return resolveAudioUnitFields(props.spec, props.audioUnitSpec);
  });
  const getSelectedData = createMemo(() => {
    return sonificationState.selection ? selectionTest(props.data, sonificationState.selection) : props.data;
  });
  const getFieldBins = createMemo(() => {
    return audioUnitFieldBins(props.spec, props.data, getSelectedData(), getResolvedFields());
  });
  const getDerivedData = createMemo(() => {
    return derivedDataset(getSelectedData(), getResolvedFields(), getFieldBins()); // TODO global selection
  });
  const getFieldDomains = createMemo(() => {
    return Object.fromEntries(
      props.audioUnitSpec.traversal.map((traversalFieldDef) => {
        const fieldDef = getFieldDef(props.spec, traversalFieldDef.field)!;
        const resolvedFieldDef = resolveFieldDef(fieldDef, traversalFieldDef);
        const domain = getDomain(resolvedFieldDef, getDerivedData(), true);
        return [traversalFieldDef.field, domain];
      })
    );
  });
  const getAxisTicks = createMemo(() => {
    return Object.fromEntries(
      props.audioUnitSpec.traversal.map((traversalFieldDef) => {
        const fieldDef = getFieldDef(props.spec, traversalFieldDef.field)!;
        const resolvedFieldDef = resolveFieldDef(fieldDef, traversalFieldDef);
        return [traversalFieldDef.field, scaleActions.getAxisTicks(resolvedFieldDef)];
      })
    );
  });

  // Snapshot passed to the pure note-generation functions in util/sonify.
  const ctx = createMemo<SonifyContext>(() => ({
    spec: props.spec,
    audioUnitSpec: props.audioUnitSpec,
    derivedData: getDerivedData(),
    fieldDomains: getFieldDomains(),
    axisTicks: getAxisTicks(),
    scales,
    pauseBetweenSections: audioEngine.pauseBetweenSections,
  }));

  const getSonifierNotes = createMemo(() => computeSonifierNotes(ctx()));
  const getDomainValue = (field: string, idx: number) => getDomainValuePure(ctx(), field, idx);
  const getPredicateForState = createMemo(() => getPredicateForStatePure(ctx(), audioUnitState.traversalState));
  const getNoteFromState = (state: TraversalState): SonifierNote | undefined => {
    return getSonifierNotes().find((note) => Object.entries(state).every(([field, index]) => note.state[field] === index));
  };

  createEffect(() => {
    // update umwelt selection when audio is playing
    if (audioEngine.isPlaying) {
      const predicate = getPredicateForState();
      umweltSelectionActions.setSelection({ source: 'sonification', predicate });
    }
  });

  createEffect((prev?: Record<string, UmweltValue[]>) => {
    // when sonification selection changes, update traversal state and transport
    const domains = getFieldDomains();
    const currentTraversalState = { ...audioUnitState.traversalState };
    let needsUpdate = false;
    const newTraversalState = { ...currentTraversalState };

    Object.entries(domains).forEach(([field, domain]) => {
      const currentIndex = currentTraversalState[field];
      const prevDomain = prev?.[field] ?? domain;
      const oldValue = prevDomain[currentIndex];

      if (oldValue !== undefined) {
        const newIndex = domain.findIndex((value) => value === oldValue);
        if (newIndex !== currentIndex) {
          newTraversalState[field] = newIndex !== -1 ? newIndex : 0;
          needsUpdate = true;
        }
      }
    });

    if (needsUpdate) {
      setAudioUnitState((prev) => ({
        ...prev,
        traversalState: newTraversalState,
      }));

      if (sonificationState.activeUnitName === props.audioUnitSpec.name) {
        actions.setupTransportSequence();
      }
    }

    return domains;
  });

  createEffect((prev) => {
    // when props update setup transport
    if (prev !== props.audioUnitSpec) {
      actions.setupTransportSequence();
    }

    return props.audioUnitSpec;
  });

  const actions: AudioUnitStateActions = {
    setTraversalIndex: (field, index) => {
      audioEngineActions.stopTransport();
      setAudioUnitState((prev) => {
        return { ...prev, traversalState: { ...prev.traversalState, [field]: index } };
      });
      if (sonificationState.activeUnitName === props.audioUnitSpec.name) {
        sonificationStateActions.setActiveUnit(props.audioUnitSpec.name);
        actions.setupTransportSequence();
      }
      // update umwelt selection
      const predicate = getPredicateForState();
      umweltSelectionActions.setSelection({ source: 'sonification', predicate });
      // play note
      const note = getNoteFromState(audioUnitState.traversalState);
      if (note) {
        audioEngine.transport.seconds = note.time;
        audioEngineActions.playNote(note);
      }
    },
    getTraversalIndex: (field) => {
      return audioUnitState.traversalState[field];
    },
    setupTransportSequence: () => {
      // Clear previous sequence
      audioEngine.transport.cancel();

      // timing is relative to bpm at time of scheduling, so set it to default
      // and then set it to the scaled value after scheduling
      audioEngine.transport.bpm.value = DEFAULT_TONE_BPM;

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

            setAudioUnitState((prev) => {
              return { ...prev, traversalState: note.state };
            });

            if (note.speakBefore && audioEngine.speakAxisTicks && !audioEngine.muted) {
              audioEngine.transport.pause();
              audioEngineActions.releaseSynth();
              speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(note.speakBefore);
              utterance.voice = speechVoice() ?? null;
              utterance.rate = audioEngine.speechRate / 25;
              utterance.onend = () => {
                if (audioEngine.isPlaying) {
                  // play note
                  if (note.ramp) {
                    audioEngineActions.startOrRampSynth(note);
                  } else {
                    audioEngineActions.playNote(note);
                  }
                  audioEngine.transport.start();
                }
              };
              speechSynthesis.speak(utterance);
            } else {
              if (note.ramp) {
                audioEngineActions.startOrRampSynth(note);
              } else {
                audioEngineActions.playNote(note);
              }
            }
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

      audioEngine.transport.bpm.value = DEFAULT_TONE_BPM * audioEngine.playbackRate;
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
    getDomainValue,
    describeEncodings: () => describeEncodingsPure(ctx()),
    describePlaybackOrder: () => describePlaybackOrderPure(ctx()),
  };

  return <AudioUnitStateContext.Provider value={[audioUnitState, actions]}>{props.children}</AudioUnitStateContext.Provider>;
}

export function useAudioUnitState() {
  const context = useContext(AudioUnitStateContext);
  if (context === undefined) {
    throw new Error('useAudioUnitState must be used within a AudioUnitStateProvider');
  }
  return context;
}
