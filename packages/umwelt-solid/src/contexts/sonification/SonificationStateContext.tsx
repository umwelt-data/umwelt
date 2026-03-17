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
  /** Register a play callback. Pass overwrite=true to force-replace (e.g. when a unit becomes active). */
  registerPlayCallback: (fn: () => void, overwrite?: boolean) => void;
  /** Invoke the currently registered play callback, if any. */
  triggerPlay: () => void;
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

  // Stored outside the reactive store — functions don't belong in stores.
  let playCallback: (() => void) | null = null;

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
    registerPlayCallback: (fn, overwrite = false) => {
      if (overwrite || playCallback === null) {
        playCallback = fn;
      }
    },
    triggerPlay: () => {
      playCallback?.();
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
