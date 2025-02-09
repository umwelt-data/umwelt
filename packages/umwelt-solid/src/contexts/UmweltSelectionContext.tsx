import { createContext, useContext, ParentProps, Accessor, createSignal } from 'solid-js';
import { UmweltDataset, UmweltPredicate } from '../types';
import { createStoredSignal } from '../util/solid';

export type UmweltSelectionProviderProps = ParentProps<{}>;

export type UmweltSelectionActions = {
  setSelection: (selection: UmweltSelection) => void;
};

export type UmweltSelectionSource = 'visualization' | 'text-navigation' | 'text-filter' | 'sonification';

export interface UmweltSelection {
  source: UmweltSelectionSource;
  predicate: UmweltPredicate | undefined;
}

const UmweltSelectionContext = createContext<[Accessor<UmweltSelection | undefined>, UmweltSelectionActions]>();

export function UmweltSelectionProvider(props: UmweltSelectionProviderProps) {
  const [selection, setSelection] = createSignal<UmweltSelection | undefined>(undefined);

  const actions: UmweltSelectionActions = {
    setSelection: (newSelection) => {
      if (newSelection && newSelection.predicate && 'and' in newSelection.predicate && newSelection.predicate.and.length === 0) {
        newSelection.predicate = undefined;
      }
      setSelection(newSelection);
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
