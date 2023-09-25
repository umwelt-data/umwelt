import { createContext, useContext, ParentProps } from 'solid-js';
import { SetStoreFunction, createStore } from 'solid-js/store';
import { UmweltSpec } from './types';

export type UmweltSpecProviderProps = ParentProps<{}>;

const initialSpec: UmweltSpec = {
  data: [],
  fields: [],
  key: [],
  visual: {
    units: [],
    composition: 'layer',
  },
  audio: {
    units: [],
    composition: 'concat',
  },
};

const UmweltSpecContext = createContext<[UmweltSpec, SetStoreFunction<UmweltSpec>]>();

export function UmweltSpecProvider(props: UmweltSpecProviderProps) {
  const [spec, setSpec] = createStore(initialSpec);
  return <UmweltSpecContext.Provider value={[spec, setSpec]}>{props.children}</UmweltSpecContext.Provider>;
}

export function useUmweltSpec() {
  const context = useContext(UmweltSpecContext);
  if (context === undefined) {
    throw new Error('useUmweltSpec must be used within a UmweltSpecProvider');
  }
  return context;
}
