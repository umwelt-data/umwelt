import { createContext, useContext, ParentProps, Accessor, createSignal } from 'solid-js';
import { UmweltDataset } from '../types';
import { createStoredSignal } from '../util/solid';

export type UmweltDatastoreProviderProps = ParentProps<{
  // when false, datasets are held in memory only and never written to
  // localStorage/sessionStorage (used by embedded viewers)
  persist?: boolean;
}>;

export type SetDatasetOptions = {
  // session datasets shadow persistent ones of the same name but only last for
  // the tab's lifetime; used for data arriving via share links so it doesn't
  // pollute (or get silently overridden by) the recipient's local datasets
  session?: boolean;
};

export type UmweltDatastoreActions = {
  setDataset: (name: string, data: UmweltDataset, sourceUrl?: string, options?: SetDatasetOptions) => void;
  removeDataset: (name: string) => void;
  removeSessionDataset: (name: string) => void;
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
  const persist = props.persist !== false;
  const [persistent, setPersistent] = persist ? createStoredSignal<UmweltDatastore>('umweltDatastore', {}) : createSignal<UmweltDatastore>({});
  const [session, setSession] = persist ? createStoredSignal<UmweltDatastore>('umweltSessionDatastore', {}, sessionStorage) : createSignal<UmweltDatastore>({});

  const datastore = () => ({ ...persistent(), ...session() });

  const actions: UmweltDatastoreActions = {
    setDataset: (name, data, sourceUrl, options) => {
      if (options?.session) {
        setSession((prev) => {
          return { ...prev, [name]: { data, sourceUrl } };
        });
      } else {
        setPersistent((prev) => {
          return { ...prev, [name]: { data, sourceUrl: prev[name]?.sourceUrl || sourceUrl } };
        });
      }
    },
    removeDataset: (name) => {
      setPersistent((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      actions.removeSessionDataset(name);
    },
    removeSessionDataset: (name) => {
      setSession((prev) => {
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
