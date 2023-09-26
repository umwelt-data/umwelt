import { createContext, useContext, ParentProps } from 'solid-js';
import { SetStoreFunction, createStore } from 'solid-js/store';
import { MeasureType, UmweltSpec } from '../types';
import { detectKey, elaborateFields } from '../util/inference';
import { useParams, useSearchParams } from '@solidjs/router';
import LZString from 'lz-string';
import { validateSpec } from '../util/spec';

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

export type UmweltSpecActions = {
  initializeData: (data: any[]) => void;
  setFieldActive: (field: string, active: boolean) => void;
  detectKey: () => void;
  reorderKeyField: (field: string, newIndex: number) => void;
  setFieldType: (field: string, type: MeasureType) => void;
};

const UmweltSpecContext = createContext<[UmweltSpec, UmweltSpecActions]>();

export function UmweltSpecProvider(props: UmweltSpecProviderProps) {
  let paramSpec: UmweltSpec | undefined;
  const [searchParams, setSearchParams] = useSearchParams();
  if (searchParams.spec) {
    try {
      const maybeSpec = JSON.parse(LZString.decompressFromEncodedURIComponent(searchParams.spec));
      if (validateSpec(maybeSpec)) {
        paramSpec = maybeSpec;
      }
    } catch (e) {
      console.warn(e);
    }
  }

  const [spec, setSpec] = createStore(paramSpec || initialSpec);

  const updateSearchParams = () => {
    setSearchParams({ spec: LZString.compressToEncodedURIComponent(JSON.stringify(spec)) });
  };

  const actions: UmweltSpecActions = {
    initializeData: (data: any[]) => {
      if (data && data.length) {
        setSpec('data', data);
        const baseFieldDefs = Object.keys(data[0]).map((name) => {
          return {
            active: true,
            name,
          };
        });
        if (!(spec.fields.length === baseFieldDefs.length && spec.fields.every((field) => baseFieldDefs.find((fieldDef) => fieldDef.name === field.name)))) {
          // elaborate fields and set field defs
          const elaboratedFields = elaborateFields(baseFieldDefs, data);
          setSpec('fields', elaboratedFields);
          actions.detectKey();
          // initialize default visual and audio units
          setSpec('visual', 'units', [
            {
              name: 'vis_unit_0',
              mark: 'point',
              encoding: {},
            },
          ]);
          setSpec('audio', 'units', [
            {
              name: 'audio_unit_0',
              encoding: {},
              traversal: [],
            },
          ]);
        }
      }
      updateSearchParams();
    },
    setFieldActive: (field: string, active: boolean) => {
      setSpec(
        'fields',
        spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, active } : fieldDef))
      );
      actions.detectKey();
      updateSearchParams();
    },
    detectKey: async () => {
      const key = await detectKey(
        spec.fields.filter((f) => f.active),
        spec.data
      );
      setSpec('key', key);
      updateSearchParams();
    },
    reorderKeyField: (field: string, newIndex: number) => {
      const key = spec.key.filter((k) => k !== field);
      key.splice(newIndex, 0, field);
      setSpec('key', key);
      updateSearchParams();
    },
    setFieldType: (field: string, type: MeasureType) => {
      setSpec(
        'fields',
        spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, type } : fieldDef))
      );
      updateSearchParams();
    },
  };

  return <UmweltSpecContext.Provider value={[spec, actions]}>{props.children}</UmweltSpecContext.Provider>;
}

export function useUmweltSpec() {
  const context = useContext(UmweltSpecContext);
  if (context === undefined) {
    throw new Error('useUmweltSpec must be used within a UmweltSpecProvider');
  }
  return context;
}
