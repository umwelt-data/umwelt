import { createContext, useContext, ParentProps, Accessor } from 'solid-js';
import { UmweltDataset } from '../types';
import { createStoredSignal } from '../util/solid';

export type UmweltDatastoreProviderProps = ParentProps<{}>;

export type UmweltDatastoreActions = {
  setDataset: (name: string, data: UmweltDataset) => void;
  removeDataset: (name: string) => void;
};

export interface UmweltDatastore {
  [name: string]: UmweltDataset;
}

const UmweltDatastoreContext = createContext<[Accessor<UmweltDatastore>, UmweltDatastoreActions]>();

export function UmweltDatastoreProvider(props: UmweltDatastoreProviderProps) {
  const [datastore, setDatastore] = createStoredSignal<UmweltDatastore>('umweltDatastore', {});

  const actions: UmweltDatastoreActions = {
    setDataset: (name, data) => {
      setDatastore((prev) => {
        return { ...prev, [name]: data };
      });
    },
    removeDataset: (name) => {
      setDatastore((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    },
  };

  return <UmweltDatastoreContext.Provider value={[datastore, actions]}>{props.children}</UmweltDatastoreContext.Provider>;
}

export function useUmweltDatastore() {
  const context = useContext(UmweltDatastoreContext);
  if (context === undefined) {
    throw new Error('useUmweltDatastore must be used within a UmweltDatastoreProvider');
  }
  return context;
}
