import { createContext, useContext, ParentProps } from 'solid-js';
import { createStore } from 'solid-js/store';
import * as Tone from 'tone';
import { TransportClass } from 'tone/build/esm/core/clock/Transport';
import { EncodedNote, TraversalState } from './AudioUnitStateContext';
import { set } from 'vega-lite/src/log';

export interface SonifierNote extends EncodedNote {
  time: number; // elapsed time when should play in transport, in seconds
  state: TraversalState; // traversal state corresponding to this note
  speakBefore?: string; // text to speak before playing
  pauseAfter?: number; // in seconds
  ramp?: boolean; // whether to ramp this note
}

interface InternalSynthState {
  isSynthPlaying: boolean;
  isNoisePlaying: boolean;
  rampTime: number; // in seconds
}

export type AudioEngineProviderProps = ParentProps<{}>;

export type AudioEngineActions = {
  startAudioContext: () => Promise<void>;
  setMuted: (muted: boolean) => void;
  setReadAxisTicks: (read: boolean) => void;
  setSpeechRate: (rate: number) => void;
  setPlaybackRate: (rate: number) => void;
  startTransport: () => void;
  stopTransport: () => void;
  playNote: (note: SonifierNote) => void;
  startOrRampSynth: (note: SonifierNote) => void;
  releaseSynth: () => void;
};

export interface AudioEngine {
  transport: TransportClass;
  muted: boolean;
  readAxisTicks: boolean;
  speechRate: number;
  playbackRate: number; // multiplier for playback speed e.g. 1x, 2x, 0.5x
  pauseBetweenSections: number; // in seconds
  isPlaying: boolean;
}

const DEFAULT_TONE_BPM = 120;

const AudioEngineContext = createContext<[AudioEngine, AudioEngineActions]>();

export function AudioEngineProvider(props: AudioEngineProviderProps) {
  const envelope = {
    attack: 0.01,
    decay: 0,
    sustain: 1,
    release: 0.01,
  };
  const synth = new Tone.Synth({
    oscillator: {
      type: 'sine',
    },
    envelope,
  }).toDestination();
  const noiseSynth = new Tone.NoiseSynth({
    noise: {
      type: 'pink',
    },
    envelope: {
      ...envelope,
      sustain: 0.2, // lower sustain for noise
    },
  }).toDestination();
  const [internalSynthState, setInternalSynthState] = createStore<InternalSynthState>({
    isSynthPlaying: false,
    isNoisePlaying: false,
    rampTime: 0.1,
  });

  const getInitialState = (): AudioEngine => {
    return {
      transport: Tone.getTransport(),
      muted: false,
      readAxisTicks: true,
      speechRate: 1,
      playbackRate: 1,
      pauseBetweenSections: 0.25,
      isPlaying: false,
    };
  };

  const [audioEngineState, setAudioEngineState] = createStore(getInitialState());

  const actions: AudioEngineActions = {
    startAudioContext: async () => {
      await Tone.start();
    },
    setMuted: (muted) => {
      setAudioEngineState((prev) => {
        return { ...prev, muted };
      });
      Tone.getDestination().mute = muted;
    },
    setReadAxisTicks: (read) => {
      setAudioEngineState((prev) => {
        return { ...prev, readAxisTicks: read };
      });
    },
    setSpeechRate: (rate) => {
      setAudioEngineState((prev) => {
        return { ...prev, speechRate: rate };
      });
    },
    setPlaybackRate: (rate) => {
      const clampedRate = Math.max(0.1, Math.min(2, rate));
      setAudioEngineState((prev) => {
        return { ...prev, playbackRate: clampedRate };
      });
      Tone.getTransport().bpm.value = DEFAULT_TONE_BPM * clampedRate;
    },
    startTransport: async () => {
      setAudioEngineState((prev) => {
        return { ...prev, isPlaying: true };
      });
      Tone.getTransport().start();
    },
    stopTransport: () => {
      setAudioEngineState((prev) => {
        return { ...prev, isPlaying: false };
      });
      Tone.getTransport().pause();
      actions.releaseSynth();
    },
    playNote: (note: SonifierNote) => {
      noiseSynth.triggerRelease();
      synth.triggerRelease();
      if (note.pitch) {
        synth.volume.value = note.volume;
        // midi to frequency for note.pitch
        // note that we're currently rounding to the nearest midi note
        // this seems reasonable imo but something to consider
        const frequency = Tone.Frequency(Math.round(note.pitch), 'midi').toFrequency();
        synth.triggerAttackRelease(frequency, note.duration);
      } else {
        noiseSynth.volume.value = note.volume;
        noiseSynth.triggerAttackRelease(note.duration);
      }
    },
    startOrRampSynth: (note: SonifierNote) => {
      if (note.pitch) {
        // stop noise synth
        noiseSynth.triggerRelease();
        setInternalSynthState('isNoisePlaying', false);
        // midi to frequency for note.pitch
        const frequency = Tone.Frequency(Math.round(note.pitch), 'midi').toFrequency();
        if (!internalSynthState.isSynthPlaying) {
          // trigger synth
          synth.volume.value = note.volume;
          setInternalSynthState('isSynthPlaying', true);
          synth.triggerAttack(frequency);
        } else {
          // ramp to new values
          synth.volume.rampTo(note.volume, internalSynthState.rampTime);
          synth.frequency.rampTo(frequency, internalSynthState.rampTime);
        }
      } else {
        // stop synth
        synth.triggerRelease();
        setInternalSynthState('isSynthPlaying', false);
        if (!internalSynthState.isNoisePlaying) {
          // trigger noise synth
          noiseSynth.volume.value = note.volume;
          setInternalSynthState('isNoisePlaying', true);
          noiseSynth.triggerAttack();
        } else {
          // ramp to new values
          noiseSynth.volume.rampTo(note.volume, internalSynthState.rampTime);
        }
      }
    },
    releaseSynth: () => {
      synth.triggerRelease();
      noiseSynth.triggerRelease();
      setInternalSynthState('isSynthPlaying', false);
      setInternalSynthState('isNoisePlaying', false);
    },
  };

  return <AudioEngineContext.Provider value={[audioEngineState, actions]}>{props.children}</AudioEngineContext.Provider>;
}

export function useAudioEngine() {
  const context = useContext(AudioEngineContext);
  if (context === undefined) {
    throw new Error('useSonificationRuntime must be used within a SonificationRuntimeProvider');
  }
  return context;
}
