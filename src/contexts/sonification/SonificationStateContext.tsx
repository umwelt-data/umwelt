import { createContext, useContext, ParentProps } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useUmweltSpec } from '../UmweltSpecContext';
import { TransportTimeClass } from 'tone';

export type SonificationStateProviderProps = ParentProps<{}>;

export type SonificationStateActions = {
  setActiveUnit: (name: string) => void;
};

export interface SonificationState {
  activeUnitName: string | undefined;
}

const SonificationContext = createContext<[SonificationState, SonificationStateActions]>();

export function SonificationStateProvider(props: SonificationStateProviderProps) {
  const [spec] = useUmweltSpec();

  const getInitialState = (): SonificationState => {
    return {
      activeUnitName: spec.audio.units.length ? spec.audio.units[0].name : undefined,
    };
  };

  const [sonificationState, setSonificationState] = createStore(getInitialState());

  const actions: SonificationStateActions = {
    setActiveUnit: (name) => {
      setSonificationState('activeUnitName', name);
    },
  };

  return <SonificationContext.Provider value={[sonificationState, actions]}>{props.children}</SonificationContext.Provider>;
}

export function useSonificationState() {
  const context = useContext(SonificationContext);
  if (context === undefined) {
    throw new Error('useSonificationRuntime must be used within a SonificationRuntimeProvider');
  }
  return context;
}
