import { createContext, useContext, ParentProps, createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useUmweltSpec } from '../UmweltSpecContext';
import { TransportTimeClass } from 'tone';
import { UmweltPredicate } from '../../types';
import { useUmweltSelection } from '../UmweltSelectionContext';

export type SonificationStateProviderProps = ParentProps<{}>;

export type SonificationStateActions = {
  setActiveUnit: (name: string) => void;
  setSelection: (predicate: UmweltPredicate | undefined) => void;
};

export interface SonificationState {
  activeUnitName: string | undefined;
  selection: UmweltPredicate | undefined;
}

const SonificationContext = createContext<[SonificationState, SonificationStateActions]>();

export function SonificationStateProvider(props: SonificationStateProviderProps) {
  const [umweltSelection] = useUmweltSelection();

  const getInitialState = (): SonificationState => {
    return {
      activeUnitName: undefined,
      selection: undefined,
    };
  };

  const [sonificationState, setSonificationState] = createStore(getInitialState());

  createEffect(() => {
    const sel = umweltSelection();
    if (sel && sel.source !== 'sonification') {
      actions.setSelection(sel.predicate);
    }
  });

  const actions: SonificationStateActions = {
    setActiveUnit: (name) => {
      setSonificationState('activeUnitName', name);
    },
    setSelection: (predicate) => {
      setSonificationState('selection', predicate);
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
