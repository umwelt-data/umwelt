import { createContext, useContext, ParentProps, createSignal, Accessor } from 'solid-js';
import { SetStoreFunction, createStore } from 'solid-js/store';
import { AudioEncodingFieldDef, EncodingPropName, EncodingRef, MeasureType, UmweltDataset, UmweltSpec, VisualEncodingFieldDef, isAudioProp, isVisualProp } from '../types';
import { detectKey, elaborateFields } from '../util/inference';
import { useParams, useSearchParams } from '@solidjs/router';
import LZString from 'lz-string';
import { exportableSpec, validateSpec } from '../util/spec';
import { Mark } from 'vega-lite/src/mark';
import { NonArgAggregateOp } from 'vega-lite/src/aggregate';
import { TimeUnit } from 'vega';
import { cleanData, typeCoerceData } from '../util/datasets';
import { set } from 'vega-lite/src/log';
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
