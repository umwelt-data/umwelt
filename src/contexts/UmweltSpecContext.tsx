import { createContext, useContext, ParentProps } from 'solid-js';
import { SetStoreFunction, createStore } from 'solid-js/store';
import { EncodingPropName, EncodingRef, MeasureType, UmweltSpec, isAudioProp, isVisualProp } from '../types';
import { detectKey, elaborateFields } from '../util/inference';
import { useParams, useSearchParams } from '@solidjs/router';
import LZString from 'lz-string';
import { validateSpec } from '../util/spec';

export type UmweltSpecProviderProps = ParentProps<{}>;

export type UmweltSpecInternalActions = {
  updateSearchParams: () => void;
  detectKey: () => void;
  ensureAudioEncodingsHaveTraversal: () => void;
};

export type UmweltSpecActions = {
  initializeData: (data: any[]) => void;
  setFieldActive: (field: string, active: boolean) => void;
  reorderKeyField: (field: string, newIndex: number) => void;
  setFieldType: (field: string, type: MeasureType) => void;
  getEncodingsForField: (field: string) => EncodingRef[];
  addEncoding: (field: string, property: EncodingPropName, unit: string) => void;
  removeEncoding: (field: string, property: EncodingPropName, unit: string) => void;
};

const UmweltSpecContext = createContext<[UmweltSpec, UmweltSpecActions]>();

export function UmweltSpecProvider(props: UmweltSpecProviderProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialSpec = (): UmweltSpec => {
    if (searchParams.spec) {
      try {
        const maybeSpec = JSON.parse(LZString.decompressFromEncodedURIComponent(searchParams.spec));
        if (validateSpec(maybeSpec)) {
          return maybeSpec;
        }
      } catch (e) {
        console.warn(e);
      }
    }
    return {
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
  };

  const [spec, setSpec] = createStore(getInitialSpec());

  const internalActions: UmweltSpecInternalActions = {
    updateSearchParams: () => {
      setSearchParams({ spec: LZString.compressToEncodedURIComponent(JSON.stringify(spec)) });
    },
    detectKey: async () => {
      const key = await detectKey(
        spec.fields.filter((f) => f.active),
        spec.data
      );
      setSpec('key', key);
      internalActions.updateSearchParams();
    },
    ensureAudioEncodingsHaveTraversal: () => {
      setSpec(
        'audio',
        'units',
        spec.audio.units.map((unit) => {
          if (Object.keys(unit.encoding).length > 0 && unit.traversal.length === 0) {
            return {
              ...unit,
              traversal: spec.key.map((field) => ({ field })),
            };
          }
          return unit;
        })
      );
      internalActions.updateSearchParams();
    },
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
          internalActions.detectKey();
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
      internalActions.updateSearchParams();
    },
    setFieldActive: (field: string, active: boolean) => {
      setSpec(
        'fields',
        spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, active } : fieldDef))
      );
      internalActions.detectKey();
      internalActions.updateSearchParams();
    },
    reorderKeyField: (field: string, newIndex: number) => {
      const key = spec.key.filter((k) => k !== field);
      key.splice(newIndex, 0, field);
      setSpec('key', key);
      internalActions.updateSearchParams();
    },
    setFieldType: (field: string, type: MeasureType) => {
      setSpec(
        'fields',
        spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, type } : fieldDef))
      );
      internalActions.updateSearchParams();
    },
    getEncodingsForField: (field: string): EncodingRef[] => {
      return spec.visual.units
        .flatMap((unit) => {
          return Object.entries(unit.encoding)
            .filter(([_, encoding]) => encoding?.field === field)
            .map(([prop, _]) => {
              return {
                unit: unit.name,
                property: prop as EncodingPropName,
              };
            });
        })
        .concat(
          spec.audio.units.flatMap((unit) => {
            return Object.entries(unit.encoding)
              .filter(([_, encoding]) => encoding?.field === field)
              .map(([prop, _]) => {
                return {
                  unit: unit.name,
                  property: prop as EncodingPropName,
                };
              });
          })
        );
    },
    addEncoding: (field: string, property: EncodingPropName, unit: string) => {
      if (isVisualProp(property) && spec.visual.units.find((u) => u.name === unit)) {
        setSpec(
          'visual',
          'units',
          spec.visual.units.map((u) => (u.name === unit ? { ...u, encoding: { ...u.encoding, [property]: { field } } } : u))
        );
      } else if (isAudioProp(property) && spec.audio.units.find((u) => u.name === unit)) {
        setSpec(
          'audio',
          'units',
          spec.audio.units.map((u) => (u.name === unit ? { ...u, encoding: { ...u.encoding, [property]: { field } } } : u))
        );
        internalActions.ensureAudioEncodingsHaveTraversal();
      }
      internalActions.updateSearchParams();
    },
    removeEncoding: (field: string, property: EncodingPropName, unit: string) => {
      if (isVisualProp(property) && spec.visual.units.find((u) => u.name === unit)) {
        setSpec(
          'visual',
          'units',
          spec.visual.units.map((u) => (u.name === unit ? { ...u, encoding: Object.fromEntries(Object.entries(u.encoding).filter(([prop, _]) => prop !== property)) } : u))
        );
      } else if (isAudioProp(property) && spec.audio.units.find((u) => u.name === unit)) {
        setSpec(
          'audio',
          'units',
          spec.audio.units.map((u) => (u.name === unit ? { ...u, encoding: Object.fromEntries(Object.entries(u.encoding).filter(([prop, _]) => prop !== property)) } : u))
        );
      }
      internalActions.updateSearchParams();
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
