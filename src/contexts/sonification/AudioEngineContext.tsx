import { createContext, useContext, ParentProps } from 'solid-js';
import { createStore } from 'solid-js/store';
import * as Tone from 'tone';
import { TransportClass } from 'tone/build/esm/core/clock/Transport';
import { EncodedNote, TraversalState } from './AudioUnitStateContext';

export interface SonifierNote extends EncodedNote {
  time: number; // elapsed time when should play in transport, in seconds
  state: TraversalState; // traversal state corresponding to this note
  speakBefore?: string; // text to speak before playing
  noise?: boolean; // does this note represent noise
  ramp?: boolean; // should we ramp from this note
}

export type AudioEngineProviderProps = ParentProps<{}>;

export type AudioEngineActions = {
  setMuted: (muted: boolean) => void;
  setReadAxisTicks: (read: boolean) => void;
  setSpeechRate: (rate: number) => void;
  setPlaybackRate: (rate: number) => void;
  startTransport: () => void;
  stopTransport: () => void;
  playNote: (note: SonifierNote) => void;
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

const AudioEngineContext = createContext<[AudioEngine, AudioEngineActions]>();

export function AudioEngineProvider(props: AudioEngineProviderProps) {
  const synth = new Tone.Synth().toDestination();
  const noiseSynth = new Tone.NoiseSynth().toDestination();

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
    setMuted: (muted) => {
      setAudioEngineState((prev) => {
        return { ...prev, muted };
      });
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
      setAudioEngineState((prev) => {
        return { ...prev, playbackRate: rate };
      });
    },
    startTransport: async () => {
      await Tone.start();
      Tone.getTransport().start();
      setAudioEngineState((prev) => {
        return { ...prev, isPlaying: true };
      });
    },
    stopTransport: () => {
      Tone.getTransport().pause();
      synth.triggerRelease();
      noiseSynth.triggerRelease();
      setAudioEngineState((prev) => {
        return { ...prev, isPlaying: false };
      });
    },
    playNote: (note: SonifierNote) => {
      if (note.pitch) {
        synth.volume.value = note.volume;
        // midi to frequency for note.pitch
        // note that we're currently rounding to the nearest midi note
        // this seems reasonable imo but something to consider
        synth.triggerAttackRelease(Tone.Frequency(Math.round(note.pitch), 'midi').toFrequency(), note.duration);
      } else {
        noiseSynth.volume.value = note.volume;
        noiseSynth.triggerAttackRelease(note.duration);
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
