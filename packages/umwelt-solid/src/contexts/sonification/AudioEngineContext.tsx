import { createContext, useContext, ParentProps, createEffect, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import * as Tone from 'tone';
import type { TransportClass } from 'tone/build/esm/core/clock/Transport';
import type { SonifierNote } from '../../util/sonify';
import { getUserSettings, setUserSettings } from '../../util/localStorage';
import { clamp } from '../../util/values';

export type { SonifierNote } from '../../util/sonify';

// Distinct oscillator timbres so that simultaneously-sounding layers are
// separable by ear. Assigned round-robin by layer index (see oscTypeForIndex).
export type OscType = 'triangle' | 'sawtooth' | 'square' | 'sine';
export const OSC_TYPES: OscType[] = ['triangle', 'sawtooth', 'square', 'sine'];
export const oscTypeForIndex = (i: number): OscType => OSC_TYPES[i % OSC_TYPES.length];

// A single monophonic voice: one pitched synth + one noise synth. The concat
// path uses just DEFAULT_VOICE; layer playback allocates one voice per unit.
export const DEFAULT_VOICE = 'default';

interface Voice {
  synth: Tone.Synth;
  noiseSynth: Tone.NoiseSynth;
  noiseGain: Tone.Gain;
  isSynthPlaying: boolean;
  isNoisePlaying: boolean;
}

const RAMP_TIME = 0.1; // seconds

export type AudioEngineProviderProps = ParentProps<{}>;

export type AudioEngineActions = {
  startAudioContext: () => Promise<void>;
  ensureVoice: (voiceId: string, oscType?: OscType) => void;
  setMuted: (muted: boolean) => void;
  setSpeakAxisTicks: (read: boolean) => void;
  setSpeechRate: (rate: number) => void;
  setPlaybackRate: (rate: number) => void;
  startTransport: () => void;
  stopTransport: () => void;
  playNote: (note: SonifierNote, voiceId?: string) => void;
  startOrRampSynth: (note: SonifierNote, voiceId?: string) => void;
  releaseSynth: (voiceId?: string) => void;
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
  // Imperative Tone.js objects live outside the reactive store, keyed by voice id.
  const voices = new Map<string, Voice>();

  const envelope = {
    attack: 0.01,
    decay: 0,
    sustain: 1,
    release: 0.01,
  };

  const ensureVoice = (voiceId: string, oscType: OscType = 'triangle'): Voice => {
    let voice = voices.get(voiceId);
    if (!voice) {
      const synth = new Tone.Synth({
        oscillator: { type: oscType },
        envelope,
      }).toDestination();
      const noiseSynth = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope,
      });
      const noiseGain = new Tone.Gain(0.3).toDestination();
      noiseSynth.connect(noiseGain);
      voice = { synth, noiseSynth, noiseGain, isSynthPlaying: false, isNoisePlaying: false };
      voices.set(voiceId, voice);
    }
    return voice;
  };

  const releaseVoice = (voice: Voice) => {
    voice.synth.triggerRelease();
    voice.noiseSynth.triggerRelease();
    voice.isSynthPlaying = false;
    voice.isNoisePlaying = false;
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

      // Dispose of all voices and transport events
      voices.forEach((voice) => {
        voice.synth.dispose();
        voice.noiseSynth.dispose();
        voice.noiseGain.dispose();
      });
      voices.clear();

      Tone.getTransport().cancel();
      Tone.getTransport().stop();
    });
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
      ensureVoice(DEFAULT_VOICE);
    },
    ensureVoice: (voiceId, oscType) => {
      ensureVoice(voiceId, oscType);
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
      if (!read) {
        speechSynthesis.cancel();
        // If transport was paused waiting for speech to finish, resume it
        if (audioEngineState.isPlaying) {
          Tone.getTransport().start();
        }
      }
    },
    setSpeechRate: (rate) => {
      const clampedRate = clamp(rate, 1, 100);
      setUserSettings({ speechRate: rate });
      setAudioEngineState((prev) => {
        return { ...prev, speechRate: clampedRate };
      });
    },
    setPlaybackRate: (rate) => {
      const clampedRate = clamp(rate, 0.1, 4);
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
    playNote: (note: SonifierNote, voiceId: string = DEFAULT_VOICE) => {
      const voice = ensureVoice(voiceId);
      voice.noiseSynth.triggerRelease();
      voice.synth.triggerRelease();
      voice.isSynthPlaying = false;
      voice.isNoisePlaying = false;
      if (note.rest) {
        return; // no datum at this step: silence
      }
      if (note.pitch) {
        voice.synth.volume.value = note.volume;
        const frequency = Tone.Frequency(note.pitch, 'midi').toFrequency();
        voice.synth.triggerAttackRelease(frequency, note.duration);
      } else {
        voice.noiseSynth.volume.value = note.volume;
        voice.noiseSynth.triggerAttackRelease(note.duration);
      }
    },
    startOrRampSynth: (note: SonifierNote, voiceId: string = DEFAULT_VOICE) => {
      const voice = ensureVoice(voiceId);
      if (note.rest) {
        releaseVoice(voice); // no datum at this step: silence
        return;
      }
      if (note.pitch) {
        // stop noise synth
        voice.noiseSynth.triggerRelease();
        voice.isNoisePlaying = false;
        const frequency = Tone.Frequency(note.pitch, 'midi').toFrequency();
        if (!voice.isSynthPlaying) {
          voice.synth.volume.value = note.volume;
          voice.isSynthPlaying = true;
          voice.synth.triggerAttack(frequency);
        } else {
          voice.synth.volume.rampTo(note.volume, RAMP_TIME);
          voice.synth.frequency.rampTo(frequency, RAMP_TIME);
        }
      } else {
        // stop synth
        voice.synth.triggerRelease();
        voice.isSynthPlaying = false;
        if (!voice.isNoisePlaying) {
          voice.noiseSynth.volume.value = note.volume;
          voice.isNoisePlaying = true;
          voice.noiseSynth.triggerAttack();
        } else {
          voice.noiseSynth.volume.rampTo(note.volume, RAMP_TIME);
        }
      }
    },
    releaseSynth: (voiceId?: string) => {
      if (voiceId !== undefined) {
        const voice = voices.get(voiceId);
        if (voice) releaseVoice(voice);
      } else {
        voices.forEach(releaseVoice);
      }
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
