import { createContext, useContext, ParentProps, createEffect, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import * as Tone from 'tone';
import type { TransportClass } from 'tone/build/esm/core/clock/Transport';
import type { SonifierNote } from '../../util/sonify';
import { InstrumentName } from '../../types';
import { getUserSettings, setUserSettings } from '../../util/localStorage';
import { clamp } from '../../util/values';

export type { SonifierNote } from '../../util/sonify';

// A pitched, monophonic Tone source. Synth/FMSynth/AMSynth all extend
// Tone.Monophonic, so they share triggerAttack/Release, `frequency`, and
// `volume` — the engine treats them uniformly and only their construction
// (below) differs. All presets must sustain (envelope sustain > 0) so they work
// in both discrete playback and continuous ramping.
type PitchedSynth = Tone.Synth | Tone.FMSynth | Tone.AMSynth;

interface InstrumentDef {
  create: () => PitchedSynth;
  // dB added to note volume to equalize perceived loudness across presets:
  // different spectra at equal amplitude differ in loudness, and volume is an
  // encoding channel, so uncalibrated presets would confound it. Values are
  // by-ear estimates relative to `pure` (see plan — a starting point, not a
  // contract); recalibrate by matching A-weighted RMS at C4/-15 dB.
  gainTrim: number;
}

// Preset timbres. Chosen so every pair differs on >= 2 of the three dominant
// timbre-perception dimensions (attack time, brightness, spectral flux/
// inharmonicity) — the current all-oscillator set varied only brightness, which
// is why sine/triangle and saw/square confuse.
export const INSTRUMENTS: Record<InstrumentName, InstrumentDef> = {
  // clean triangle beep — the historical default; most pitch-legible source
  pure: {
    create: () => new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0, sustain: 1, release: 0.01 } }),
    gainTrim: 0,
  },
  // buzzy sawtooth: bright, fast attack, no inharmonicity
  bright: {
    create: () => new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0, sustain: 1, release: 0.05 } }),
    gainTrim: -6,
  },
  // clarinet-ish square with a slow attack (breaks the saw/square confusion by
  // differing on attack as well as spectrum)
  hollow: {
    create: () => new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.08, decay: 0, sustain: 1, release: 0.05 } }),
    gainTrim: -8,
  },
  // electric bell: FM with inharmonic partials, fast attack
  bell: {
    create: () =>
      new Tone.FMSynth({
        harmonicity: 3.01,
        modulationIndex: 12,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0, sustain: 1, release: 0.1 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.005, decay: 0, sustain: 1, release: 0.1 },
      }),
    gainTrim: -2,
  },
  // reedy AM tone: amplitude-modulation roughness, medium attack
  reed: {
    create: () =>
      new Tone.AMSynth({
        harmonicity: 2,
        oscillator: { type: 'square' },
        envelope: { attack: 0.06, decay: 0, sustain: 1, release: 0.05 },
        modulation: { type: 'square' },
        modulationEnvelope: { attack: 0.06, decay: 0, sustain: 1, release: 0.05 },
      }),
    // AM output reads quieter by ear than the amplitude suggests; lifted from -6,
    // and again to 0 as it still read a touch under bell/strings.
    gainTrim: 0,
  },
  // detuned-unison pad: chorus/beating flux, slow attack
  strings: {
    create: () => new Tone.Synth({ oscillator: { type: 'fatsawtooth', count: 3, spread: 20 } as any, envelope: { attack: 0.15, decay: 0, sustain: 1, release: 0.2 } }),
    gainTrim: -7,
  },
};

// Layer auto-assignment order: the first few entries are maximally distinct so
// small layer counts (the common case) get the most separable timbres. Assigned
// round-robin by layer index when a unit declares no explicit instrument.
export const LAYER_INSTRUMENT_ORDER: InstrumentName[] = ['pure', 'bell', 'bright', 'reed', 'hollow', 'strings'];
export const instrumentForIndex = (i: number): InstrumentName => LAYER_INSTRUMENT_ORDER[i % LAYER_INSTRUMENT_ORDER.length];

// A single monophonic voice: one pitched synth + one noise synth, both routed
// through a per-voice stereo panner. Each audio unit gets its own voice (keyed
// by unit name); DEFAULT_VOICE is the fallback where no unit context exists.
export const DEFAULT_VOICE = 'default';

interface Voice {
  synth: PitchedSynth;
  noiseSynth: Tone.NoiseSynth;
  noiseGain: Tone.Gain;
  panner: Tone.Panner;
  instrument: InstrumentName;
  gainTrim: number; // dB loudness offset for `instrument` (see InstrumentDef)
  isSynthPlaying: boolean;
  isNoisePlaying: boolean;
}

const RAMP_TIME = 0.1; // seconds

// Tone's transport is a single process-global clock, so only one embedded viewer
// can meaningfully sound at a time. The engine that currently owns playback
// registers here; a newly-starting engine deactivates it first. This keeps the
// stopped viewer's `isPlaying` / Play button state truthful instead of leaving it
// stuck showing "Pause" after another embed silently commandeered the transport.
// (The 'p' shortcut is scoped to the focused viewer separately; see
// SonificationKeyHandlers.)
let activePlayback: { deactivate: () => void } | null = null;

export type AudioEngineProviderProps = ParentProps<{}>;

export type AudioEngineActions = {
  startAudioContext: () => Promise<void>;
  ensureVoice: (voiceId: string, instrument?: InstrumentName) => void;
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

  const disposeVoice = (voice: Voice) => {
    voice.synth.dispose();
    voice.noiseSynth.dispose();
    voice.noiseGain.dispose();
    voice.panner.dispose();
  };

  // Get the voice for `voiceId`, creating it if absent. Passing an `instrument`
  // that differs from the existing voice's rebuilds it (spec edits); passing no
  // instrument returns the existing voice untouched, so playback callers that
  // don't know the instrument never clobber it.
  const ensureVoice = (voiceId: string, instrument?: InstrumentName): Voice => {
    let voice = voices.get(voiceId);
    if (voice && instrument !== undefined && voice.instrument !== instrument) {
      disposeVoice(voice);
      voices.delete(voiceId);
      voice = undefined;
    }
    if (!voice) {
      const inst = instrument ?? 'pure';
      const def = INSTRUMENTS[inst];
      const panner = new Tone.Panner(0).toDestination();
      const synth = def.create().connect(panner);
      const noiseSynth = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope,
      });
      const noiseGain = new Tone.Gain(0.3);
      noiseSynth.connect(noiseGain);
      noiseGain.connect(panner);
      voice = { synth, noiseSynth, noiseGain, panner, instrument: inst, gainTrim: def.gainTrim, isSynthPlaying: false, isNoisePlaying: false };
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
      voices.forEach(disposeVoice);
      voices.clear();

      // Only tear down the shared transport if this engine owns playback —
      // otherwise unmounting an idle embed would stop a sibling that's playing.
      if (activePlayback === playbackToken) {
        activePlayback = null;
        Tone.getTransport().cancel();
        Tone.getTransport().stop();
      }
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

  // Tear down this engine's playback (UI state + sound) without touching the
  // cross-embed registry. Shared by stopTransport and by the coordinator when
  // another embed takes over the transport.
  const deactivate = () => {
    setAudioEngineState((prev) => ({ ...prev, isPlaying: false }));
    speechSynthesis.cancel();
    Tone.getTransport().pause();
    actions.releaseSynth();
  };
  const playbackToken = { deactivate };

  const actions: AudioEngineActions = {
    startAudioContext: async () => {
      await Tone.start();
      ensureVoice(DEFAULT_VOICE);
    },
    ensureVoice: (voiceId, instrument) => {
      ensureVoice(voiceId, instrument);
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
      // Exclusive playback: stop whichever other embed currently owns the shared
      // transport before claiming it, so its button state stays truthful.
      if (activePlayback && activePlayback !== playbackToken) {
        activePlayback.deactivate();
      }
      activePlayback = playbackToken;
      setAudioEngineState((prev) => {
        return { ...prev, isPlaying: true };
      });
      Tone.getTransport().start();
    },
    stopTransport: () => {
      deactivate();
      if (activePlayback === playbackToken) {
        activePlayback = null;
      }
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
      voice.panner.pan.value = note.pan;
      if (note.pitch) {
        voice.synth.volume.value = note.volume + voice.gainTrim;
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
          voice.synth.volume.value = note.volume + voice.gainTrim;
          voice.panner.pan.value = note.pan;
          voice.isSynthPlaying = true;
          voice.synth.triggerAttack(frequency);
        } else {
          voice.synth.volume.rampTo(note.volume + voice.gainTrim, RAMP_TIME);
          voice.synth.frequency.rampTo(frequency, RAMP_TIME);
          voice.panner.pan.rampTo(note.pan, RAMP_TIME);
        }
      } else {
        // stop synth
        voice.synth.triggerRelease();
        voice.isSynthPlaying = false;
        if (!voice.isNoisePlaying) {
          voice.noiseSynth.volume.value = note.volume;
          voice.panner.pan.value = note.pan;
          voice.isNoisePlaying = true;
          voice.noiseSynth.triggerAttack();
        } else {
          voice.noiseSynth.volume.rampTo(note.volume, RAMP_TIME);
          voice.panner.pan.rampTo(note.pan, RAMP_TIME);
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
