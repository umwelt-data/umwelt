import { createContext, useContext, ParentProps, createSignal, batch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { AudioEncodingFieldDef, EncodingPropName, EncodingRef, ExportableSpec, MeasureType, UmweltAggregateOp, UmweltDataset, UmweltSpec, UmweltTimeUnit, ViewComposition, VisualEncodingFieldDef, isAudioProp, isVisualProp, isExportableUmweltURLDataSource, isExportableUmweltValuesDataSource, ExportableUmweltDataSource } from '../types';
import { detectKey, elaborateFields } from '../util/inference';
import { useSearchParams } from '@solidjs/router';
import LZString from 'lz-string';
import { compressedSpec, exportableSpec, validateSpec, validateSpecAsync } from '../util/spec';
import { Mark } from 'vega-lite/src/mark';
import { cleanData, DEFAULT_DATASET_NAME, typeCoerceData, getData } from '../util/datasets';
import { useUmweltDatastore } from './UmweltDatastoreContext';
import { getDefaultSpec } from '../util/heuristics';

export type UmweltSpecProviderProps = ParentProps<{}>;

export type UmweltSpecInternalActions = {
  updateSearchParams: () => void;
  detectKey: () => void;
  checkDefaultSpecHeuristics: () => void;
  ensureAudioEncodingsHaveTraversal: () => void;
  removeUnitIfEmpty: (unit: string) => void;
};

export type UmweltSpecActions = {
  initializeData: (name: string) => Promise<void>;
  setFieldActive: (field: string, active: boolean) => void;
  reorderKeyField: (field: string, newIndex: number) => void;
  setFieldType: (field: string, type: MeasureType) => void;
  addEncoding: (field: string, property: EncodingPropName, unit: string) => void;
  removeEncoding: (field: string, property: EncodingPropName, unit: string) => void;
  changeMark: (unit: string, mark: Mark) => void;
  addVisualUnit: () => void;
  removeVisualUnit: (unit: string) => void;
  addAudioUnit: () => void;
  removeAudioUnit: (unit: string) => void;
  renameUnit: (oldName: string, newName: string) => void;
  setComposition: (modality: 'visual' | 'audio', composition: ViewComposition) => void;
  reorderTraversal: (unit: string, field: string, newIndex: number) => void;
  setFieldAggregate: (field: string, aggregate: UmweltAggregateOp | 'undefined') => void;
  setFieldBin: (field: string, bin: boolean) => void;
  setFieldTimeUnit: (field: string, timeUnit: UmweltTimeUnit | 'undefined') => void;
  setEncodingAggregate: (unit: string, property: EncodingPropName, aggregate: UmweltAggregateOp | 'undefined') => void;
  setEncodingBin: (unit: string, property: EncodingPropName, bin: boolean) => void;
  setEncodingTimeUnit: (unit: string, property: EncodingPropName, timeUnit: UmweltTimeUnit | 'undefined') => void;
  setTraversalBin: (unit: string, field: string, bin: boolean) => void;
  setTraversalTimeUnit: (unit: string, field: string, timeUnit: UmweltTimeUnit | 'undefined') => void;
};

const UmweltSpecContext = createContext<[UmweltSpec, UmweltSpecActions]>();

export function UmweltSpecProvider(props: UmweltSpecProviderProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [datastore, datastoreActions] = useUmweltDatastore();

  const getInitialSpec = (): UmweltSpec => {
    if (searchParams.spec) {
      try {
        const exportedSpec: ExportableSpec = JSON.parse(LZString.decompressFromEncodedURIComponent(searchParams.spec));
        const maybeSpec = validateSpec(exportedSpec, datastore());
        if (maybeSpec) {
          return maybeSpec;
        }
        // If validation failed, return a default spec with the expected data name
        // initializeData will handle loading the data asynchronously
        if (exportedSpec.data) {
          const dataName = exportedSpec.data.name || (isExportableUmweltURLDataSource(exportedSpec.data) ? exportedSpec.data.url.split('/').pop() : DEFAULT_DATASET_NAME) || DEFAULT_DATASET_NAME;
          return {
            data: { name: dataName },
            fields: [],
            key: [],
            visual: { units: [], composition: 'layer' },
            audio: { units: [], composition: 'concat' },
          };
        }
      } catch (e) {
        console.warn(e);
      }
    }
    return {
      data: { name: DEFAULT_DATASET_NAME },
      fields: [],
      key: [],
      visual: { units: [], composition: 'layer' },
      audio: { units: [], composition: 'concat' },
    };
  };

  const [spec, setSpec] = createStore(getInitialSpec());
  const data = () => datastore()[spec.data.name]?.data || [];
  const [visualUnitCount, setVisualUnitCount] = createSignal<number>(0);
  const [audioUnitCount, setAudioUnitCount] = createSignal<number>(0);

  const internalActions: UmweltSpecInternalActions = {
    updateSearchParams: () => {
      if (searchParams.spec) {
        setSearchParams({ spec: compressedSpec(spec, datastore()) });
      }
    },
    detectKey: async () => {
      const key = await detectKey(
        spec.fields.filter((f) => f.active),
        data()
      );
      setSpec('key', key);
      // check for default visual and audio units
      internalActions.checkDefaultSpecHeuristics();
      internalActions.updateSearchParams();
    },
    checkDefaultSpecHeuristics: () => {
      if (spec.visual.units.length === 0 && spec.audio.units.length === 0) {
        batch(() => {
          // initialize default visual and audio units
          const keyFieldDefs = spec.fields.filter((field) => field.active && spec.key.includes(field.name));
          const valueFieldDefs = spec.fields.filter((field) => field.active && !spec.key.includes(field.name));
          const defaultSpec = getDefaultSpec(keyFieldDefs, valueFieldDefs, data());
          setSpec('visual', defaultSpec.visual);
          setSpec('audio', defaultSpec.audio);
          // update encoding refs to match new spec
          const fieldNameToEncodingRefs = new Map<string, EncodingRef[]>();
          defaultSpec.visual.units.forEach((unit) => {
            Object.entries(unit.encoding).forEach(([propName, encFieldDef]) => {
              const field = encFieldDef?.field;
              const encodingRef: EncodingRef = { property: propName as any, unit: unit.name };
              if (field) {
                fieldNameToEncodingRefs.set(field, [...(fieldNameToEncodingRefs.get(field) || []), encodingRef]);
              }
            });
          });
          defaultSpec.audio.units.forEach((unit) => {
            Object.entries(unit.encoding).forEach(([propName, encFieldDef]) => {
              const field = encFieldDef?.field;
              const encodingRef: EncodingRef = { property: propName as any, unit: unit.name };
              if (field) {
                fieldNameToEncodingRefs.set(field, [...(fieldNameToEncodingRefs.get(field) || []), encodingRef]);
              }
            });
          });
          setSpec(
            'fields',
            spec.fields.map((fieldDef) => {
              return {
                ...fieldDef,
                encodings: fieldNameToEncodingRefs.get(fieldDef.name) || [],
              };
            })
          );
        });
      }
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
    removeUnitIfEmpty: (unit: string) => {
      const maybeVisualUnit = spec.visual.units.find((u) => u.name === unit);
      if (maybeVisualUnit && spec.visual.units.length > 1) {
        if (maybeVisualUnit.encoding && Object.keys(maybeVisualUnit.encoding).length === 0) {
          setSpec(
            'visual',
            'units',
            spec.visual.units.filter((u) => u.name !== unit)
          );
          internalActions.updateSearchParams();
        }
      }
      const maybeAudioUnit = spec.audio.units.find((u) => u.name === unit);
      if (maybeAudioUnit && spec.audio.units.length > 1) {
        if (maybeAudioUnit.encoding && Object.keys(maybeAudioUnit.encoding).length === 0) {
          setSpec(
            'audio',
            'units',
            spec.audio.units.filter((u) => u.name !== unit)
          );
          internalActions.updateSearchParams();
        }
      }
    },
  };

  const actions: UmweltSpecActions = {
    initializeData: async (name: string) => {
      let entry = datastore()[name];
      let data = entry?.data;

      // If data not found and we have search params, try to load from URL using validateSpecAsync
      if (!data && searchParams.spec) {
        try {
          const exportedSpec: ExportableSpec = JSON.parse(LZString.decompressFromEncodedURIComponent(searchParams.spec));
          const validatedSpec = await validateSpecAsync(exportedSpec, datastore(), datastoreActions.setDataset);
          if (validatedSpec && validatedSpec.data.name === name) {
            entry = datastore()[name];
            data = entry?.data;
            // Update the spec with the validated spec from URL parameters
            batch(() => {
              setSpec('fields', validatedSpec.fields);
              setSpec('key', validatedSpec.key);
              setSpec('visual', validatedSpec.visual);
              setSpec('audio', validatedSpec.audio);
              internalActions.updateSearchParams();
            });
          }
        } catch (e) {
          console.warn('Failed to load data from search params:', e);
        }
      }

      if (data && data.length) {
        batch(() => {
          setSpec('data', 'name', name);
          const baseFieldDefs = Object.keys(data[0]).map((name) => {
            return {
              active: true,
              name,
              encodings: [],
            };
          });
          // elaborate fields and set field defs
          const elaboratedFields = elaborateFields(baseFieldDefs, data);
          setSpec('fields', elaboratedFields);
          setSpec('key', []);
          setSpec('visual', {
            units: [],
            composition: 'layer',
          });
          setSpec('audio', {
            units: [],
            composition: 'concat',
          });
          // type and clean data
          const typedData = typeCoerceData(data, spec.fields);
          const cleanedData = cleanData(typedData, spec.fields);
          datastoreActions.setDataset(name, cleanedData);
          internalActions.updateSearchParams();
        });
        // detect key
        internalActions.detectKey();
      }
    },
    setFieldActive: (field: string, active: boolean) => {
      setSpec(
        'fields',
        spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, active } : fieldDef))
      );
      if (!active) {
        // remove encodings for this field
        spec.fields
          .find((fieldDef) => fieldDef.name === field)
          ?.encodings.forEach((enc) => {
            actions.removeEncoding(field, enc.property, enc.unit);
          });
      }
      internalActions.detectKey();
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
    addEncoding: (field: string, property: EncodingPropName, unit: string) => {
      batch(() => {
        if (isVisualProp(property) && spec.visual.units.find((u) => u.name === unit)) {
          setSpec(
            'visual',
            'units',
            spec.visual.units.map((u) => (u.name === unit ? { ...u, encoding: { ...u.encoding, [property]: { field } } } : u))
          );
          setSpec(
            'fields',
            spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, encodings: [{ property, unit }, ...fieldDef.encodings] } : fieldDef))
          );
        } else if (isAudioProp(property) && spec.audio.units.find((u) => u.name === unit)) {
          setSpec(
            'audio',
            'units',
            spec.audio.units.map((u) => (u.name === unit ? { ...u, encoding: { ...u.encoding, [property]: { field } } } : u))
          );
          setSpec(
            'fields',
            spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, encodings: [{ property, unit }, ...fieldDef.encodings] } : fieldDef))
          );
          internalActions.ensureAudioEncodingsHaveTraversal();
        }
      });
      internalActions.updateSearchParams();
    },
    removeEncoding: (field: string, property: EncodingPropName, unit: string) => {
      batch(() => {
        if (isVisualProp(property) && spec.visual.units.find((u) => u.name === unit)) {
          setSpec(
            'visual',
            'units',
            spec.visual.units.map((u) => (u.name === unit ? { ...u, encoding: Object.fromEntries(Object.entries(u.encoding).filter(([prop, _]) => prop !== property)) } : u))
          );
          setSpec(
            'fields',
            spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, encodings: fieldDef.encodings.filter((enc) => !(enc.property === property && enc.unit === unit)) } : fieldDef))
          );
          internalActions.removeUnitIfEmpty(unit);
        } else if (isAudioProp(property) && spec.audio.units.find((u) => u.name === unit)) {
          setSpec(
            'audio',
            'units',
            spec.audio.units.map((u) => (u.name === unit ? { ...u, encoding: Object.fromEntries(Object.entries(u.encoding).filter(([prop, _]) => prop !== property)) } : u))
          );
          setSpec(
            'fields',
            spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, encodings: fieldDef.encodings.filter((enc) => !(enc.property === property && enc.unit === unit)) } : fieldDef))
          );
          internalActions.removeUnitIfEmpty(unit);
        }
      });
      internalActions.updateSearchParams();
    },
    changeMark: (unit: string, mark: Mark) => {
      setSpec(
        'visual',
        'units',
        spec.visual.units.map((u) => (u.name === unit ? { ...u, mark } : u))
      );
      internalActions.updateSearchParams();
    },
    addVisualUnit: () => {
      let name = `vis_unit_${visualUnitCount()}`;
      while (spec.visual.units.find((u) => u.name === name)) {
        setVisualUnitCount(visualUnitCount() + 1);
        name = `vis_unit_${visualUnitCount()}`;
      }
      setSpec('visual', 'units', [...spec.visual.units, { name, mark: 'point', encoding: {} }]);
      internalActions.updateSearchParams();
    },
    removeVisualUnit: (unit: string) => {
      if (spec.visual.units.length > 1) {
        setSpec(
          'visual',
          'units',
          spec.visual.units.filter((u) => u.name !== unit)
        );
        internalActions.updateSearchParams();
      }
    },
    addAudioUnit: () => {
      let name = `audio_unit_${audioUnitCount()}`;
      while (spec.audio.units.find((u) => u.name === name)) {
        setAudioUnitCount(audioUnitCount() + 1);
        name = `audio_unit_${audioUnitCount()}`;
      }
      setSpec('audio', 'units', [...spec.audio.units, { name, encoding: {}, traversal: [] }]);
      internalActions.updateSearchParams();
    },
    removeAudioUnit: (unit: string) => {
      if (spec.audio.units.length > 1) {
        setSpec(
          'audio',
          'units',
          spec.audio.units.filter((u) => u.name !== unit)
        );
        internalActions.updateSearchParams();
      }
    },
    renameUnit: (oldName: string, newName: string) => {
      if (spec.visual.units.find((u) => u.name === oldName) && !spec.visual.units.find((u) => u.name === newName)) {
        setSpec(
          'visual',
          'units',
          spec.visual.units.map((u) => (u.name === oldName ? { ...u, name: newName } : u))
        );
        internalActions.updateSearchParams();
      } else if (spec.audio.units.find((u) => u.name === oldName) && !spec.audio.units.find((u) => u.name === newName)) {
        setSpec(
          'audio',
          'units',
          spec.audio.units.map((u) => (u.name === oldName ? { ...u, name: newName } : u))
        );
        internalActions.updateSearchParams();
      }
    },
    setComposition: (modality: 'visual' | 'audio', composition: ViewComposition) => {
      setSpec(modality, 'composition', composition);
      internalActions.updateSearchParams();
    },
    reorderTraversal: (unit, field, newIndex) => {
      const unitDef = spec.audio.units.find((u) => u.name === unit);
      if (unitDef) {
        const traversalDef = unitDef.traversal.find((t) => t.field === field);
        if (traversalDef) {
          const newTraversals = unitDef.traversal.filter((t) => t.field !== field);
          newTraversals.splice(newIndex, 0, traversalDef);
          setSpec(
            'audio',
            'units',
            spec.audio.units.map((u) => (u.name === unit ? { ...u, traversal: newTraversals } : u))
          );
        }
      }
    },
    setFieldAggregate: (field: string, inputAggregate: UmweltAggregateOp | 'undefined') => {
      const aggregate = inputAggregate === 'undefined' ? undefined : inputAggregate;
      setSpec(
        'fields',
        spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, aggregate } : fieldDef))
      );
      internalActions.updateSearchParams();
    },
    setFieldBin: (field: string, bin: boolean) => {
      setSpec(
        'fields',
        spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, bin } : fieldDef))
      );
      internalActions.updateSearchParams();
    },
    setFieldTimeUnit: (field: string, inputTimeUnit: UmweltTimeUnit | 'undefined') => {
      const timeUnit = inputTimeUnit === 'undefined' ? undefined : inputTimeUnit;
      setSpec(
        'fields',
        spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, timeUnit } : fieldDef))
      );
      internalActions.updateSearchParams();
    },
    setEncodingAggregate: (unit: string, property: EncodingPropName, inputAggregate: UmweltAggregateOp | 'undefined') => {
      const aggregate = inputAggregate === 'undefined' ? undefined : inputAggregate;
      if (isVisualProp(property) && spec.visual.units.find((u) => u.name === unit)) {
        setSpec(
          'visual',
          'units',
          spec.visual.units.map((u) => (u.name === unit ? { ...u, encoding: { ...u.encoding, [property]: { ...(u.encoding[property] as VisualEncodingFieldDef), aggregate } } } : u))
        );
        internalActions.updateSearchParams();
      } else if (isAudioProp(property) && spec.audio.units.find((u) => u.name === unit)) {
        setSpec(
          'audio',
          'units',
          spec.audio.units.map((u) => (u.name === unit ? { ...u, encoding: { ...u.encoding, [property]: { ...(u.encoding[property] as AudioEncodingFieldDef), aggregate } } } : u))
        );
        internalActions.updateSearchParams();
      }
    },
    setEncodingBin: (unit: string, property: EncodingPropName, bin: boolean) => {
      if (isVisualProp(property) && spec.visual.units.find((u) => u.name === unit)) {
        setSpec(
          'visual',
          'units',
          spec.visual.units.map((u) => (u.name === unit ? { ...u, encoding: { ...u.encoding, [property]: { ...(u.encoding[property] as VisualEncodingFieldDef), bin } } } : u))
        );
        internalActions.updateSearchParams();
      }
    },
    setEncodingTimeUnit: (unit: string, property: EncodingPropName, inputTimeUnit: UmweltTimeUnit | 'undefined') => {
      const timeUnit = inputTimeUnit === 'undefined' ? undefined : inputTimeUnit;
      if (isVisualProp(property) && spec.visual.units.find((u) => u.name === unit)) {
        setSpec(
          'visual',
          'units',
          spec.visual.units.map((u) => (u.name === unit ? { ...u, encoding: { ...u.encoding, [property]: { ...(u.encoding[property] as VisualEncodingFieldDef), timeUnit } } } : u))
        );
        internalActions.updateSearchParams();
      }
    },
    setTraversalBin: (unit: string, field: string, bin: boolean) => {
      setSpec(
        'audio',
        'units',
        spec.audio.units.map((u) => (u.name === unit ? { ...u, traversal: u.traversal.map((t) => (t.field === field ? { ...t, bin } : t)) } : u))
      );
      internalActions.updateSearchParams();
    },
    setTraversalTimeUnit: (unit: string, field: string, inputTimeUnit: UmweltTimeUnit | 'undefined') => {
      const timeUnit = inputTimeUnit === 'undefined' ? undefined : inputTimeUnit;
      setSpec(
        'audio',
        'units',
        spec.audio.units.map((u) => (u.name === unit ? { ...u, traversal: u.traversal.map((t) => (t.field === field ? { ...t, timeUnit } : t)) } : u))
      );
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
