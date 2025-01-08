import { createContext, useContext, ParentProps } from 'solid-js';
import { createStore } from 'solid-js/store';

export type SonificationRuntimeProviderProps = ParentProps<{}>;

export type SonificationRuntimeActions = {
  setMuted: (muted: boolean) => void;
  setReadAxisTicks: (read: boolean) => void;
  setSpeechRate: (rate: number) => void;
  setPlaybackRate: (rate: number) => void;
};

export interface SonificationRuntime {
  muted: boolean;
  readAxisTicks: boolean;
  speechRate: number;
  playbackRate: number;
}

const SonificationRuntimeContext = createContext<[SonificationRuntime, SonificationRuntimeActions]>();

export function SonificationRuntimeProvider(props: SonificationRuntimeProviderProps) {
  const getInitialRuntime = (): SonificationRuntime => {
    return {
      muted: false,
      readAxisTicks: true,
      speechRate: 1,
      playbackRate: 1,
    };
  };

  const [runtime, setRuntime] = createStore(getInitialRuntime());

  const actions: SonificationRuntimeActions = {
    setMuted: (muted) => {
      setRuntime((prev) => {
        return { ...prev, muted };
      });
    },
    setReadAxisTicks: (read) => {
      setRuntime((prev) => {
        return { ...prev, readAxisTicks: read };
      });
    },
    setSpeechRate: (rate) => {
      setRuntime((prev) => {
        return { ...prev, speechRate: rate };
      });
    },
    setPlaybackRate: (rate) => {
      setRuntime((prev) => {
        return { ...prev, playbackRate: rate };
      });
    },
  };

  return <SonificationRuntimeContext.Provider value={[runtime, actions]}>{props.children}</SonificationRuntimeContext.Provider>;
}

export function useSonificationRuntime() {
  const context = useContext(SonificationRuntimeContext);
  if (context === undefined) {
    throw new Error('useSonificationRuntime must be used within a SonificationRuntimeProvider');
  }
  return context;
}
