// Layer composition for sonification.
//
// Where concat renders one independent AudioUnitStateProvider per unit (each its
// own scales, traversal, and mutually-exclusive playback), a layer group plays
// all its units *simultaneously* under one shared traversal and one set of
// controls. Each unit sounds on its own distinct-timbre voice.
//
// This provider supplies the SAME AudioUnitStateContext value as the single-unit
// provider, so the existing TraversalFieldControl / AudioUnitPlaybackControl work
// against it unchanged — here the "unit" is the whole group and its traversal is
// the shared (union) traversal.
//
// Design decisions (see plan): shared traversal = union domain over the units'
// traversal field(s); encoding channels stay independent per unit; the primary
// unit (units[0]) drives the cursor, spoken axis-tick announcements, selection,
// and stop; secondary units only schedule their audio, at their own note times
// (independent per-note durations — layers with differently-encoded durations may
// drift, which is accepted).

import { createContext, ParentProps, createMemo, createEffect, createSignal, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import { AudioUnitSpec, UmweltDataset, UmweltSpec, UmweltValue } from '../../types';
import { getFieldDef, resolveAudioUnitFields, resolveFieldDef } from '../../util/spec';
import { selectionTest } from '../../util/selection';
import { getDomain } from '../../util/domain';
import { derivedDataset } from '../../util/transforms';
import { audioUnitFieldBins } from '../../util/ticks';
import { useUmweltSelection } from '../UmweltSelectionContext';
import { DEFAULT_TONE_BPM, oscTypeForIndex, useAudioEngine } from './AudioEngineContext';
import { useSonificationState } from './SonificationStateContext';
import { AudioUnitStateContext, AudioUnitState, AudioUnitStateActions } from './AudioUnitStateContext';
import { audioAxisTicks, buildAudioScales } from './AudioScalesContext';
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

export type AudioLayerGroupProviderProps = ParentProps<{
  spec: UmweltSpec;
  data: UmweltDataset;
  units: AudioUnitSpec[];
  groupName: string;
}>;

const getNoteFromState = (notes: SonifierNote[], state: TraversalState): SonifierNote | undefined => {
  return notes.find((note) => Object.entries(state).every(([field, index]) => note.state[field] === index));
};

export function AudioLayerGroupProvider(props: AudioLayerGroupProviderProps) {
  const [_, umweltSelectionActions] = useUmweltSelection();
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

  // Grouped units share the same traversal field(s) (seeded from spec.key); the
  // primary unit's traversal is canonical.
  const primaryUnit = () => props.units[0];
  const sharedTraversal = () => primaryUnit().traversal;

  const getInitialState = (): AudioUnitState => {
    return {
      traversalState: Object.fromEntries(sharedTraversal().map((td) => [td.field, 0])),
    };
  };

  const [audioUnitState, setAudioUnitState] = createStore(getInitialState());

  // Per-unit derived data + scales (encoding channels stay independent per unit).
  const perUnit = createMemo(() => {
    const sel = sonificationState.selection;
    return props.units.map((unit) => {
      const resolvedFields = resolveAudioUnitFields(props.spec, unit);
      const selectedData = sel ? selectionTest(props.data, sel) : props.data;
      const fieldBins = audioUnitFieldBins(props.spec, props.data, selectedData, resolvedFields);
      const derivedData = derivedDataset(selectedData, resolvedFields, fieldBins);
      const scales = buildAudioScales(props.spec, props.data, unit);
      return { unit, derivedData, scales };
    });
  });

  // Shared union traversal domain: reuse getDomain over the concatenation of
  // every unit's derived data, so sorting/dedup match the single-unit path.
  const sharedFieldDomains = createMemo(() => {
    const combined = perUnit().flatMap((u) => u.derivedData);
    return Object.fromEntries(
      sharedTraversal().map((td) => {
        const fieldDef = getFieldDef(props.spec, td.field)!;
        const resolvedFieldDef = resolveFieldDef(fieldDef, td);
        return [td.field, getDomain(resolvedFieldDef, combined, true)];
      })
    ) as Record<string, UmweltValue[]>;
  });

  const axisTicks = createMemo(() => {
    return Object.fromEntries(sharedTraversal().map((td) => [td.field, audioAxisTicks(props.spec, props.data, td.field)])) as Record<string, UmweltValue[]>;
  });

  const ctxForUnit = (unit: AudioUnitSpec, derivedData: UmweltDataset, scales: SonifyContext['scales']): SonifyContext => ({
    spec: props.spec,
    audioUnitSpec: unit,
    derivedData,
    fieldDomains: sharedFieldDomains(),
    axisTicks: axisTicks(),
    scales,
    pauseBetweenSections: audioEngine.pauseBetweenSections,
  });

  // The primary context represents the shared traversal for cursor/selection/
  // description purposes.
  const primaryCtx = createMemo(() => {
    const p = perUnit()[0];
    return ctxForUnit(p.unit, p.derivedData, p.scales);
  });

  // { voiceId, oscType, notes } per unit. All units enumerate the same shared
  // traversal states, so notes align step-for-step (differing only in
  // pitch/volume/duration and which steps are rests).
  const notesByUnit = createMemo(() => {
    return perUnit().map((u, idx) => ({
      voiceId: u.unit.name,
      oscType: oscTypeForIndex(idx),
      notes: computeSonifierNotes(ctxForUnit(u.unit, u.derivedData, u.scales)),
    }));
  });

  const primaryNotes = () => notesByUnit()[0]?.notes ?? [];

  const getPredicateForState = createMemo(() => getPredicateForStatePure(primaryCtx(), audioUnitState.traversalState));
  const getFieldDomains = () => sharedFieldDomains();
  const getDomainValue = (field: string, idx: number) => getDomainValuePure(primaryCtx(), field, idx);

  const isActive = () => sonificationState.activeUnitName === props.groupName;

  createEffect(() => {
    if (audioEngine.isPlaying) {
      umweltSelectionActions.setSelection({ source: 'sonification', predicate: getPredicateForState() });
    }
  });

  createEffect((prev?: Record<string, UmweltValue[]>) => {
    // when selection changes, keep the shared traversal on the same domain value
    const domains = sharedFieldDomains();
    const current = { ...audioUnitState.traversalState };
    let needsUpdate = false;
    const next = { ...current };

    Object.entries(domains).forEach(([field, domain]) => {
      const currentIndex = current[field];
      const prevDomain = prev?.[field] ?? domain;
      const oldValue = prevDomain[currentIndex];
      if (oldValue !== undefined) {
        const newIndex = domain.findIndex((value) => value === oldValue);
        if (newIndex !== currentIndex) {
          next[field] = newIndex !== -1 ? newIndex : 0;
          needsUpdate = true;
        }
      }
    });

    if (needsUpdate) {
      setAudioUnitState((prev) => ({ ...prev, traversalState: next }));
      if (isActive()) actions.setupTransportSequence();
    }
    return domains;
  });

  createEffect((prev) => {
    if (prev !== props.units) {
      actions.setupTransportSequence();
    }
    return props.units;
  });

  const playStateAcrossUnits = (state: TraversalState) => {
    notesByUnit().forEach(({ voiceId, oscType, notes }) => {
      audioEngineActions.ensureVoice(voiceId, oscType);
      const note = getNoteFromState(notes, state);
      if (note) audioEngineActions.playNote(note, voiceId);
    });
  };

  const actions: AudioUnitStateActions = {
    setTraversalIndex: (field, index) => {
      audioEngineActions.stopTransport();
      setAudioUnitState((prev) => ({ ...prev, traversalState: { ...prev.traversalState, [field]: index } }));
      if (isActive()) {
        sonificationStateActions.setActiveUnit(props.groupName);
        actions.setupTransportSequence();
      }
      umweltSelectionActions.setSelection({ source: 'sonification', predicate: getPredicateForState() });
      // preview: seek to the primary note time and sound every layer at this step
      const primaryNote = getNoteFromState(primaryNotes(), audioUnitState.traversalState);
      if (primaryNote) audioEngine.transport.seconds = primaryNote.time;
      playStateAcrossUnits(audioUnitState.traversalState);
    },
    getTraversalIndex: (field) => audioUnitState.traversalState[field],
    getFieldDomains,
    getDerivedData: () => primaryCtx().derivedData,
    getDomainValue,
    setupTransportSequence: () => {
      audioEngine.transport.cancel();
      audioEngine.transport.bpm.value = DEFAULT_TONE_BPM;

      const units = notesByUnit();

      // Longest voice end drives when the whole group stops, so a longer
      // secondary layer isn't cut off.
      let globalEnd = 0;
      units.forEach(({ notes }) => {
        const last = notes[notes.length - 1];
        if (last) globalEnd = Math.max(globalEnd, last.time + last.duration);
      });

      units.forEach(({ voiceId, oscType, notes }, unitIdx) => {
        audioEngineActions.ensureVoice(voiceId, oscType);
        const isPrimary = unitIdx === 0;

        notes.forEach((note) => {
          // position the playhead at the current cursor (primary timeline)
          if (isPrimary && Object.entries(note.state).every(([f, i]) => audioUnitState.traversalState[f] === i)) {
            audioEngine.transport.seconds = note.time;
          }

          audioEngine.transport.schedule(() => {
            if (!audioEngine.isPlaying) return;

            if (isPrimary) {
              setAudioUnitState((prev) => ({ ...prev, traversalState: note.state }));
            }

            if (isPrimary && note.speakBefore && audioEngine.speakAxisTicks && !audioEngine.muted) {
              // pause the whole transport (all voices) for the announcement,
              // then resume, replaying every layer's note for this step
              audioEngine.transport.pause();
              audioEngineActions.releaseSynth();
              speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(note.speakBefore);
              utterance.voice = speechVoice() ?? null;
              utterance.rate = audioEngine.speechRate / 25;
              utterance.onend = () => {
                if (audioEngine.isPlaying) {
                  playStateAcrossUnits(note.state);
                  audioEngine.transport.start();
                }
              };
              speechSynthesis.speak(utterance);
            } else {
              if (note.ramp) {
                audioEngineActions.startOrRampSynth(note, voiceId);
              } else {
                audioEngineActions.playNote(note, voiceId);
              }
            }
          }, note.time);

          if (note.pauseAfter) {
            audioEngine.transport.schedule(() => audioEngineActions.releaseSynth(voiceId), note.time + note.duration);
          }
        });
      });

      audioEngine.transport.schedule(() => audioEngineActions.stopTransport(), globalEnd);
      audioEngine.transport.bpm.value = DEFAULT_TONE_BPM * audioEngine.playbackRate;
    },
    resetTraversalIfEnd: () => {
      const domains = sharedFieldDomains();
      const traversalEnd = sharedTraversal().every((td) => audioUnitState.traversalState[td.field] === domains[td.field].length - 1);
      if (traversalEnd) {
        setAudioUnitState(getInitialState());
        audioEngine.transport.seconds = 0;
      }
    },
    describeEncodings: () => props.units.map((u, i) => `layer ${i + 1}: ${describeEncodingsPure(ctxForUnit(u, perUnit()[i].derivedData, perUnit()[i].scales))}`).join('; '),
    describePlaybackOrder: () => describePlaybackOrderPure(primaryCtx()),
  };

  return <AudioUnitStateContext.Provider value={[audioUnitState, actions]}>{props.children}</AudioUnitStateContext.Provider>;
}
