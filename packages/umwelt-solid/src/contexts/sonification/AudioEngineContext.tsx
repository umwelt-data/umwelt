import { createContext, useContext, ParentProps, createEffect, createSignal, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import * as Tone from 'tone';
import { TransportClass } from 'tone/build/esm/core/clock/Transport';
import { EncodedNote, TraversalState } from './AudioUnitStateContext';
import { set } from 'vega-lite/src/log';
import { getUserSettings, setUserSettings } from '../../util/localStorage';
import { clamp } from '../../util/values';

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
  setSpeakAxisTicks: (read: boolean) => void;
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
  speakAxisTicks: boolean;
  speechRate: number;
  playbackRate: number; // multiplier for playback speed e.g. 1x, 2x, 0.5x
  pauseBetweenSections: number; // in seconds
  isPlaying: boolean;
}

export const DEFAULT_TONE_BPM = 120;

const AudioEngineContext = createContext<[AudioEngine, AudioEngineActions]>();

export function AudioEngineProvider(props: AudioEngineProviderProps) {
  // Create synths lazily when needed
  const [synth, setSynth] = createSignal<Tone.Synth | null>(null);
  const [noiseSynth, setNoiseSynth] = createSignal<Tone.NoiseSynth | null>(null);

  const initializeSynths = () => {
    if (!synth()) {
      const newSynth = new Tone.Synth({
        oscillator: {
          type: 'triangle',
        },
        envelope: {
          attack: 0.01,
          decay: 0,
          sustain: 1,
          release: 0.01,
        },
      }).toDestination();
      setSynth(newSynth);
    }

    if (!noiseSynth()) {
      const newNoiseSynth = new Tone.NoiseSynth({
        noise: {
          type: 'pink',
        },
        envelope: {
          attack: 0.01,
          decay: 0,
          sustain: 0.2,
          release: 0.01,
        },
      }).toDestination();
      setNoiseSynth(newNoiseSynth);
    }
  };

  createEffect(() => {
    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        actions.stopTransport();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    onCleanup(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Dispose of synths and transport events
      synth()?.dispose();
      noiseSynth()?.dispose();
      setSynth(null);
      setNoiseSynth(null);

      // Clear all transport events
      Tone.getTransport().cancel();
      Tone.getTransport().stop();
    });
  });

  const [internalSynthState, setInternalSynthState] = createStore<InternalSynthState>({
    isSynthPlaying: false,
    isNoisePlaying: false,
    rampTime: 0.1,
  });

  const getInitialState = (): AudioEngine => {
    const userSettings = getUserSettings();
    return {
      transport: Tone.getTransport(),
      muted: userSettings?.muted ?? false,
      speakAxisTicks: userSettings?.speakAxisTicks ?? true,
      speechRate: userSettings?.speechRate ?? 50,
      playbackRate: userSettings?.playbackRate ?? 1,
      pauseBetweenSections: 0.25,
      isPlaying: false,
    };
  };

  const [audioEngineState, setAudioEngineState] = createStore(getInitialState());

  createEffect(() => {
    // synchronize playback rate to transport bpm
    audioEngineState.transport.bpm.value = DEFAULT_TONE_BPM * audioEngineState.playbackRate;
  });

  const actions: AudioEngineActions = {
    startAudioContext: async () => {
      await Tone.start();
      initializeSynths();
    },
    setMuted: (muted) => {
      setUserSettings({ muted });
      setAudioEngineState((prev) => {
        return { ...prev, muted };
      });
      Tone.getDestination().mute = muted;
    },
    setSpeakAxisTicks: (read) => {
      setUserSettings({ speakAxisTicks: read });
      setAudioEngineState((prev) => {
        return { ...prev, speakAxisTicks: read };
      });
    },
    setSpeechRate: (rate) => {
      const clampedRate = clamp(rate, 1, 100);
      setUserSettings({ speechRate: rate });
      setAudioEngineState((prev) => {
        return { ...prev, speechRate: clampedRate };
      });
    },
    setPlaybackRate: (rate) => {
      const clampedRate = clamp(rate, 0.1, 2);
      setUserSettings({ playbackRate: clampedRate });
      setAudioEngineState((prev) => {
        return { ...prev, playbackRate: clampedRate };
      });
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
      speechSynthesis.cancel();
      Tone.getTransport().pause();
      actions.releaseSynth();
    },
    playNote: (note: SonifierNote) => {
      if (!synth() || !noiseSynth()) {
        initializeSynths();
      }
      noiseSynth()?.triggerRelease();
      synth()?.triggerRelease();
      if (note.pitch) {
        synth()!.volume.value = note.volume;
        // midi to frequency for note.pitch
        const frequency = Tone.Frequency(note.pitch, 'midi').toFrequency();
        synth()!.triggerAttackRelease(frequency, note.duration);
      } else {
        noiseSynth()!.volume.value = note.volume;
        noiseSynth()!.triggerAttackRelease(note.duration);
      }
    },
    startOrRampSynth: (note: SonifierNote) => {
      if (!synth() || !noiseSynth()) {
        initializeSynths();
      }
      if (note.pitch) {
        // stop noise synth
        noiseSynth()!.triggerRelease();
        setInternalSynthState('isNoisePlaying', false);
        // midi to frequency for note.pitch
        const frequency = Tone.Frequency(note.pitch, 'midi').toFrequency();
        if (!internalSynthState.isSynthPlaying) {
          // trigger synth
          synth()!.volume.value = note.volume;
          setInternalSynthState('isSynthPlaying', true);
          synth()!.triggerAttack(frequency);
        } else {
          // ramp to new values
          synth()!.volume.rampTo(note.volume, internalSynthState.rampTime);
          synth()!.frequency.rampTo(frequency, internalSynthState.rampTime);
        }
      } else {
        // stop synth
        synth()!.triggerRelease();
        setInternalSynthState('isSynthPlaying', false);
        if (!internalSynthState.isNoisePlaying) {
          // trigger noise synth
          noiseSynth()!.volume.value = note.volume;
          setInternalSynthState('isNoisePlaying', true);
          noiseSynth()!.triggerAttack();
        } else {
          // ramp to new values
          noiseSynth()!.volume.rampTo(note.volume, internalSynthState.rampTime);
        }
      }
    },
    releaseSynth: () => {
      synth()?.triggerRelease();
      noiseSynth()?.triggerRelease();
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
