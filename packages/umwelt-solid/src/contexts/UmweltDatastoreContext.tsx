import { createContext, useContext, ParentProps, Accessor } from 'solid-js';
import { UmweltDataset, ExportableUmweltDataSource } from '../types';
import { createStoredSignal } from '../util/solid';

export type UmweltDatastoreProviderProps = ParentProps<{}>;

export type UmweltDatastoreActions = {
  setDataset: (name: string, data: UmweltDataset, sourceUrl?: string) => void;
  removeDataset: (name: string) => void;
};

export interface UmweltDatastoreEntry {
  data: UmweltDataset;
  sourceUrl?: string;
}

export interface UmweltDatastore {
  [name: string]: UmweltDatastoreEntry;
}

const UmweltDatastoreContext = createContext<[Accessor<UmweltDatastore>, UmweltDatastoreActions]>();

export function UmweltDatastoreProvider(props: UmweltDatastoreProviderProps) {
  const [datastore, setDatastore] = createStoredSignal<UmweltDatastore>('umweltDatastore', {});

  const actions: UmweltDatastoreActions = {
    setDataset: (name, data, sourceUrl) => {
      setDatastore((prev) => {
        return { ...prev, [name]: { data, sourceUrl: prev[name]?.sourceUrl || sourceUrl } };
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
