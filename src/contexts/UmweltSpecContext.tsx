import { createContext, useContext, ParentProps, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { AudioEncodingFieldDef, EncodingPropName, FieldDef, MeasureType, UmweltDataset, UmweltSpec, VisualEncodingFieldDef, isAudioProp, isVisualProp } from '../types';
import { detectKey, elaborateFields } from '../util/inference';
import { useSearchParams } from '@solidjs/router';
import LZString from 'lz-string';
import { exportableSpec, getFieldDef, validateSpec } from '../util/spec';
import { Mark } from 'vega-lite/src/mark';
import { NonArgAggregateOp } from 'vega-lite/src/aggregate';
import { TimeUnit } from 'vega';
import { cleanData, typeCoerceData } from '../util/datasets';
import { useUmweltDatastore } from './UmweltDatastoreContext';
import { getDefaultSpec } from '../util/heuristics';

export type UmweltSpecProviderProps = ParentProps<{}>;

export type UmweltSpecInternalActions = {
  updateSearchParams: () => void;
  detectKey: () => void;
  ensureAudioEncodingsHaveTraversal: () => void;
  removeUnitIfEmpty: (unit: string) => void;
};

export type UmweltSpecActions = {
  initializeData: (name: string) => void;
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
  setFieldAggregate: (field: string, aggregate: NonArgAggregateOp | 'undefined') => void;
  setFieldBin: (field: string, bin: boolean) => void;
  setFieldTimeUnit: (field: string, timeUnit: TimeUnit | 'undefined') => void;
  setEncodingAggregate: (unit: string, property: EncodingPropName, aggregate: NonArgAggregateOp | 'undefined') => void;
  setEncodingBin: (unit: string, property: EncodingPropName, bin: boolean) => void;
  setEncodingTimeUnit: (unit: string, property: EncodingPropName, timeUnit: TimeUnit | 'undefined') => void;
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
      data: {
        values: [],
      },
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
  const [visualUnitCount, setVisualUnitCount] = createSignal<number>(0);
  const [audioUnitCount, setAudioUnitCount] = createSignal<number>(0);

  const [datastore, _] = useUmweltDatastore();

  const internalActions: UmweltSpecInternalActions = {
    updateSearchParams: () => {
      setSearchParams({ spec: LZString.compressToEncodedURIComponent(JSON.stringify(exportableSpec(spec))) });
    },
    detectKey: async () => {
      const key = await detectKey(
        spec.fields.filter((f) => f.active),
        spec.data.values
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
      const data = datastore()[name];
      if (data && data.length) {
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
        // type and clean data
        const typedData = typeCoerceData(data, spec.fields);
        const cleanedData = cleanData(typedData, spec.fields);
        setSpec('data', 'values', cleanedData);
        // detect key
        await internalActions.detectKey();
        // initialize default visual and audio units
        const keyFieldDefs = spec.fields.filter((field) => field.active && spec.key.includes(field.name));
        const valueFieldDefs = spec.fields.filter((field) => field.active && !spec.key.includes(field.name));
        const defaultSpec = getDefaultSpec(keyFieldDefs, valueFieldDefs, spec.data.values);
        setSpec('visual', defaultSpec.visual);
        setSpec('audio', defaultSpec.audio);
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
    addEncoding: (field: string, property: EncodingPropName, unit: string) => {
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
      internalActions.updateSearchParams();
    },
    removeEncoding: (field: string, property: EncodingPropName, unit: string) => {
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
    setFieldAggregate: (field: string, inputAggregate: NonArgAggregateOp | 'undefined') => {
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
    setFieldTimeUnit: (field: string, inputTimeUnit: TimeUnit | 'undefined') => {
      const timeUnit = inputTimeUnit === 'undefined' ? undefined : inputTimeUnit;
      setSpec(
        'fields',
        spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, timeUnit } : fieldDef))
      );
      internalActions.updateSearchParams();
    },
    setEncodingAggregate: (unit: string, property: EncodingPropName, inputAggregate: NonArgAggregateOp | 'undefined') => {
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
    setEncodingTimeUnit: (unit: string, property: EncodingPropName, inputTimeUnit: TimeUnit | 'undefined') => {
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
