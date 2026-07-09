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

import { createContext, ParentProps, createMemo, createEffect, createSignal, onCleanup, untrack } from 'solid-js';
import { createStore } from 'solid-js/store';
import { AudioUnitSpec, UmweltDataset, UmweltSpec, UmweltValue } from '../../types';
import { getFieldDef, resolveAudioUnitFields, resolveFieldDef } from '../../util/spec';
import { selectionTest } from '../../util/selection';
import { getDomain } from '../../util/domain';
import { derivedDataset } from '../../util/transforms';
import { audioUnitFieldBins } from '../../util/ticks';
import { useUmweltSelection } from '../UmweltSelectionContext';
import { DEFAULT_TONE_BPM, instrumentForIndex, useAudioEngine } from './AudioEngineContext';
import { useSonificationState } from './SonificationStateContext';
import { AudioUnitStateContext, AudioUnitState, AudioUnitStateActions } from './AudioUnitStateContext';
import { audioAxisTicks, buildAudioScales } from './AudioScalesContext';
import {
  SonifyContext,
  TraversalState,
  computeLayerGrid,
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

  // { voiceId, instrument, notes } per unit. All units enumerate the same shared
  // traversal states, so notes align step-for-step (differing only in
  // pitch/volume/duration/pan and which steps are rests). Each layer sounds on a
  // distinct timbre so simultaneous layers stay separable: the unit's explicit
  // instrument if set, else an auto-assigned distinct one by layer index.
  const notesByUnit = createMemo(() => {
    return perUnit().map((u, idx) => ({
      voiceId: u.unit.name,
      instrument: u.unit.instrument ?? instrumentForIndex(idx),
      notes: computeSonifierNotes(ctxForUnit(u.unit, u.derivedData, u.scales)),
    }));
  });

  // Shared playback grid: one slot per traversal step, every layer sounding
  // together, the slot advancing by the longest layer's duration (see
  // computeLayerGrid). This keeps all layers locked on one clock.
  const grid = createMemo(() => computeLayerGrid(notesByUnit().map((u) => ({ voiceId: u.voiceId, notes: u.notes }))));
  const gridStepForState = (state: TraversalState) => grid().find((step) => Object.entries(state).every(([field, index]) => step.state[field] === index));

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

  const ensureVoices = () => notesByUnit().forEach(({ voiceId, instrument }) => audioEngineActions.ensureVoice(voiceId, instrument));
  // Sound every layer's note for a slot on its own voice. `ramp` follows the
  // slot (all layers share the innermost traversal, so they ramp together).
  const triggerStep = (step: ReturnType<typeof grid>[number]) => {
    step.notes.forEach(({ voiceId, note }) => {
      if (step.ramp) audioEngineActions.startOrRampSynth(note, voiceId);
      else audioEngineActions.playNote(note, voiceId);
    });
  };
  // Discrete preview (single blip per layer), used when scrubbing.
  const previewStep = (step: ReturnType<typeof grid>[number]) => {
    step.notes.forEach(({ voiceId, note }) => audioEngineActions.playNote(note, voiceId));
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
      // preview: seek to this slot on the shared grid and sound every layer
      ensureVoices();
      const step = gridStepForState(audioUnitState.traversalState);
      if (step) {
        audioEngine.transport.seconds = step.time;
        previewStep(step);
      }
    },
    getTraversalIndex: (field) => audioUnitState.traversalState[field],
    getFieldDomains,
    getDerivedData: () => primaryCtx().derivedData,
    getDomainValue,
    // untrack: this is an imperative scheduling action, not a derivation. Effects
    // that call it must not subscribe to the signals it reads (traversal state,
    // grid, ...) — otherwise every step callback's state update re-runs the
    // effect mid-playback, rewinding the transport onto the slot that just fired
    // and re-triggering its announcement and notes.
    setupTransportSequence: () => untrack(() => {
      audioEngine.transport.cancel();
      audioEngine.transport.bpm.value = DEFAULT_TONE_BPM;

      ensureVoices();
      const steps = grid();

      steps.forEach((step) => {
        // position the playhead at the current cursor
        if (Object.entries(step.state).every(([f, i]) => audioUnitState.traversalState[f] === i)) {
          audioEngine.transport.seconds = step.time;
        }

        audioEngine.transport.schedule(() => {
          if (!audioEngine.isPlaying) return;

          setAudioUnitState((prev) => ({ ...prev, traversalState: step.state }));

          if (step.speakBefore && audioEngine.speakAxisTicks && !audioEngine.muted) {
            // pause the whole transport (all voices) for the announcement, then
            // resume, replaying every layer's note for this slot
            audioEngine.transport.pause();
            audioEngineActions.releaseSynth();
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(step.speakBefore);
            utterance.voice = speechVoice() ?? null;
            utterance.rate = audioEngine.speechRate / 25;
            utterance.onend = () => {
              if (audioEngine.isPlaying) {
                triggerStep(step);
                audioEngine.transport.start();
              }
            };
            speechSynthesis.speak(utterance);
          } else {
            triggerStep(step);
          }
        }, step.time);

        if (step.pauseAfter) {
          audioEngine.transport.schedule(() => audioEngineActions.releaseSynth(), step.time + step.slotDuration);
        }
      });

      const last = steps[steps.length - 1];
      if (last) {
        audioEngine.transport.schedule(() => audioEngineActions.stopTransport(), last.time + last.slotDuration);
      }
      audioEngine.transport.bpm.value = DEFAULT_TONE_BPM * audioEngine.playbackRate;
    }),
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
