import { createContext, useContext, ParentProps, Accessor, createSignal } from 'solid-js';
import { UmweltDataset, UmweltPredicate } from '../types';
import { createStoredSignal } from '../util/solid';

export type UmweltSelectionProviderProps = ParentProps<{}>;

export type UmweltSelectionActions = {
  setSelection: (selection: UmweltSelection) => void;
  clearSelection: () => void;
};

export type UmweltSelectionSource = 'visualization' | 'text-navigation' | 'text-filter' | 'sonification';

export interface UmweltSelection {
  source: UmweltSelectionSource;
  predicate: UmweltPredicate;
}

const UmweltSelectionContext = createContext<[Accessor<UmweltSelection | undefined>, UmweltSelectionActions]>();

export function UmweltSelectionProvider(props: UmweltSelectionProviderProps) {
  const [selection, setSelection] = createSignal<UmweltSelection | undefined>(undefined);

  const actions: UmweltSelectionActions = {
    setSelection: (newSelection) => {
      setSelection(newSelection);
    },
    clearSelection: () => {
      setSelection(undefined);
    },
  };

  return <UmweltSelectionContext.Provider value={[selection, actions]}>{props.children}</UmweltSelectionContext.Provider>;
}

export function useUmweltSelection() {
  const context = useContext(UmweltSelectionContext);
  if (context === undefined) {
    throw new Error('useUmweltSelection must be used within a UmweltSelectionProvider');
  }
  return context;
}
