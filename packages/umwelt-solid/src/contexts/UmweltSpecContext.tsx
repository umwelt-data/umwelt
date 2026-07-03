import { createContext, useContext, ParentProps, createSignal, batch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { AudioEncodingFieldDef, EncodingPropName, EncodingRef, ExportableSpec, MeasureType, UmweltAggregateOp, UmweltSpec, UmweltTimeUnit, ViewComposition, VisualEncodingFieldDef, isAudioProp, isVisualProp, isExportableUmweltURLDataSource } from '../types';
import { detectKey, elaborateFields } from '../util/inference';
import { decodeSpecFromString, elaborateExportableSpec } from '../util/spec';
import { Mark } from 'vega-lite/build/src/mark';
import { cleanData, DEFAULT_DATASET_NAME, typeCoerceData, resolveDataSource } from '../util/datasets';
import { useUmweltDatastore } from './UmweltDatastoreContext';
import { getDefaultSpec } from '../util/heuristics';

export type UmweltSpecProviderProps = ParentProps<{}>;

const CURRENT_SPEC_STORAGE_KEY = 'umweltCurrentSpec';

export type UmweltSpecInternalActions = {
  persistSpec: () => void;
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
  const [datastore, datastoreActions] = useUmweltDatastore();

  // read a shared spec from the URL's hash fragment if present, then strip it
  const consumeSharedSpecParam = (): ExportableSpec | undefined => {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const specString = hashParams.get('spec');
    if (!specString) {
      return undefined;
    }
    hashParams.delete('spec');
    url.hash = hashParams.toString();
    history.replaceState(null, '', url.toString());
    return decodeSpecFromString(specString);
  };

  const defaultSpec = (): UmweltSpec => {
    return {
      data: { name: DEFAULT_DATASET_NAME },
      fields: [],
      key: [],
      visual: { units: [], composition: 'layer' },
      audio: { units: [], composition: 'concat' },
    };
  };

  const sharedSpec = consumeSharedSpecParam();

  const getInitialSpec = (): UmweltSpec => {
    if (sharedSpec && sharedSpec.data) {
      // start from a stub carrying the incoming dataset name so the Data panel doesn't
      // auto-load a different dataset; importExportableSpec fills the rest in asynchronously
      const dataName = sharedSpec.data.name || (isExportableUmweltURLDataSource(sharedSpec.data) ? sharedSpec.data.url.split('/').pop() : undefined) || DEFAULT_DATASET_NAME;
      return { ...defaultSpec(), data: { name: dataName } };
    }
    // restore the working spec from the previous session, if its data is still around
    const persisted = localStorage.getItem(CURRENT_SPEC_STORAGE_KEY);
    if (persisted) {
      try {
        const persistedSpec: UmweltSpec = JSON.parse(persisted);
        if (persistedSpec.data?.name && datastore()[persistedSpec.data.name]?.data?.length) {
          return persistedSpec;
        }
      } catch (e) {
        console.warn('Failed to restore working spec:', e);
      }
    }
    return defaultSpec();
  };

  const [spec, setSpec] = createStore(getInitialSpec());
  const data = () => datastore()[spec.data.name]?.data || [];
  const [visualUnitCount, setVisualUnitCount] = createSignal<number>(0);
  const [audioUnitCount, setAudioUnitCount] = createSignal<number>(0);

  const internalActions: UmweltSpecInternalActions = {
    persistSpec: () => {
      localStorage.setItem(CURRENT_SPEC_STORAGE_KEY, JSON.stringify(spec));
    },
    detectKey: async () => {
      const key = await detectKey(
        spec.fields.filter((f) => f.active),
        data()
      );
      setSpec('key', key);
      // check for default visual and audio units
      internalActions.checkDefaultSpecHeuristics();
      internalActions.persistSpec();
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
      internalActions.persistSpec();
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
          internalActions.persistSpec();
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
          internalActions.persistSpec();
        }
      }
    },
  };

  const actions: UmweltSpecActions = {
    initializeData: async (name: string) => {
      // an explicit load of a local dataset overrides any session dataset shadowing its name
      datastoreActions.removeSessionDataset(name);
      const entry = datastore()[name];
      const data = entry?.data;

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
          internalActions.persistSpec();
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
      // Sync audio unit traversal order to match new key order
      setSpec(
        'audio',
        'units',
        spec.audio.units.map((unit) => {
          const reordered = [...unit.traversal].sort((a, b) => {
            const aIdx = key.indexOf(a.field);
            const bIdx = key.indexOf(b.field);
            // Fields not in key go to the end, preserving their relative order
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          });
          return { ...unit, traversal: reordered };
        })
      );
      internalActions.persistSpec();
    },
    setFieldType: (field: string, type: MeasureType) => {
      setSpec(
        'fields',
        spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, type } : fieldDef))
      );
      internalActions.persistSpec();
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
      internalActions.persistSpec();
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
      internalActions.persistSpec();
    },
    changeMark: (unit: string, mark: Mark) => {
      setSpec(
        'visual',
        'units',
        spec.visual.units.map((u) => (u.name === unit ? { ...u, mark } : u))
      );
      internalActions.persistSpec();
    },
    addVisualUnit: () => {
      let name = `vis_unit_${visualUnitCount()}`;
      while (spec.visual.units.find((u) => u.name === name)) {
        setVisualUnitCount(visualUnitCount() + 1);
        name = `vis_unit_${visualUnitCount()}`;
      }
      setSpec('visual', 'units', [...spec.visual.units, { name, mark: 'point', encoding: {} }]);
      internalActions.persistSpec();
    },
    removeVisualUnit: (unit: string) => {
      if (spec.visual.units.length > 1) {
        setSpec(
          'visual',
          'units',
          spec.visual.units.filter((u) => u.name !== unit)
        );
        internalActions.persistSpec();
      }
    },
    addAudioUnit: () => {
      let name = `audio_unit_${audioUnitCount()}`;
      while (spec.audio.units.find((u) => u.name === name)) {
        setAudioUnitCount(audioUnitCount() + 1);
        name = `audio_unit_${audioUnitCount()}`;
      }
      setSpec('audio', 'units', [...spec.audio.units, { name, encoding: {}, traversal: [] }]);
      internalActions.persistSpec();
    },
    removeAudioUnit: (unit: string) => {
      if (spec.audio.units.length > 1) {
        setSpec(
          'audio',
          'units',
          spec.audio.units.filter((u) => u.name !== unit)
        );
        internalActions.persistSpec();
      }
    },
    renameUnit: (oldName: string, newName: string) => {
      if (spec.visual.units.find((u) => u.name === oldName) && !spec.visual.units.find((u) => u.name === newName)) {
        setSpec(
          'visual',
          'units',
          spec.visual.units.map((u) => (u.name === oldName ? { ...u, name: newName } : u))
        );
        internalActions.persistSpec();
      } else if (spec.audio.units.find((u) => u.name === oldName) && !spec.audio.units.find((u) => u.name === newName)) {
        setSpec(
          'audio',
          'units',
          spec.audio.units.map((u) => (u.name === oldName ? { ...u, name: newName } : u))
        );
        internalActions.persistSpec();
      }
    },
    setComposition: (modality: 'visual' | 'audio', composition: ViewComposition) => {
      setSpec(modality, 'composition', composition);
      internalActions.persistSpec();
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
      internalActions.persistSpec();
    },
    setFieldBin: (field: string, bin: boolean) => {
      setSpec(
        'fields',
        spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, bin } : fieldDef))
      );
      internalActions.persistSpec();
    },
    setFieldTimeUnit: (field: string, inputTimeUnit: UmweltTimeUnit | 'undefined') => {
      const timeUnit = inputTimeUnit === 'undefined' ? undefined : inputTimeUnit;
      setSpec(
        'fields',
        spec.fields.map((fieldDef) => (fieldDef.name === field ? { ...fieldDef, timeUnit } : fieldDef))
      );
      internalActions.persistSpec();
    },
    setEncodingAggregate: (unit: string, property: EncodingPropName, inputAggregate: UmweltAggregateOp | 'undefined') => {
      const aggregate = inputAggregate === 'undefined' ? undefined : inputAggregate;
      if (isVisualProp(property) && spec.visual.units.find((u) => u.name === unit)) {
        setSpec(
          'visual',
          'units',
          spec.visual.units.map((u) => (u.name === unit ? { ...u, encoding: { ...u.encoding, [property]: { ...(u.encoding[property] as VisualEncodingFieldDef), aggregate } } } : u))
        );
        internalActions.persistSpec();
      } else if (isAudioProp(property) && spec.audio.units.find((u) => u.name === unit)) {
        setSpec(
          'audio',
          'units',
          spec.audio.units.map((u) => (u.name === unit ? { ...u, encoding: { ...u.encoding, [property]: { ...(u.encoding[property] as AudioEncodingFieldDef), aggregate } } } : u))
        );
        internalActions.persistSpec();
      }
    },
    setEncodingBin: (unit: string, property: EncodingPropName, bin: boolean) => {
      if (isVisualProp(property) && spec.visual.units.find((u) => u.name === unit)) {
        setSpec(
          'visual',
          'units',
          spec.visual.units.map((u) => (u.name === unit ? { ...u, encoding: { ...u.encoding, [property]: { ...(u.encoding[property] as VisualEncodingFieldDef), bin } } } : u))
        );
        internalActions.persistSpec();
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
        internalActions.persistSpec();
      }
    },
    setTraversalBin: (unit: string, field: string, bin: boolean) => {
      setSpec(
        'audio',
        'units',
        spec.audio.units.map((u) => (u.name === unit ? { ...u, traversal: u.traversal.map((t) => (t.field === field ? { ...t, bin } : t)) } : u))
      );
      internalActions.persistSpec();
    },
    setTraversalTimeUnit: (unit: string, field: string, inputTimeUnit: UmweltTimeUnit | 'undefined') => {
      const timeUnit = inputTimeUnit === 'undefined' ? undefined : inputTimeUnit;
      setSpec(
        'audio',
        'units',
        spec.audio.units.map((u) => (u.name === unit ? { ...u, traversal: u.traversal.map((t) => (t.field === field ? { ...t, timeUnit } : t)) } : u))
      );
      internalActions.persistSpec();
    },
  };

  // load a spec that arrived via share URL: resolve its data source (embedded values,
  // url, or example dataset name), stash the data in the session layer, and elaborate
  const importExportableSpec = async (exportable: ExportableSpec): Promise<boolean> => {
    if (!exportable.data || !(exportable.fields && exportable.fields.length)) {
      return false;
    }
    const resolved = await resolveDataSource(exportable.data);
    if (!resolved) {
      return false;
    }
    const elaborated = elaborateExportableSpec(exportable);
    const typedData = typeCoerceData(resolved.data, elaborated.fields);
    const cleanedData = cleanData(typedData, elaborated.fields);
    if (!cleanedData.length) {
      return false;
    }
    // session dataset: usable for this spec, but doesn't pollute the local datastore
    datastoreActions.setDataset(resolved.name, cleanedData, resolved.sourceUrl, { session: true });

    // data columns the exported spec doesn't mention become inactive fields
    const specFieldNames = new Set(elaborated.fields.map((f) => f.name));
    const missingColumns = Object.keys(cleanedData[0]).filter((column) => !specFieldNames.has(column));
    const supplementedFields = elaborateFields(
      missingColumns.map((column) => ({ active: false, name: column, encodings: [] })),
      cleanedData
    ).map((fieldDef) => ({ ...fieldDef, active: false }));

    batch(() => {
      setSpec('data', 'name', resolved.name);
      setSpec('fields', [...elaborated.fields, ...supplementedFields]);
      setSpec('key', elaborated.key);
      setSpec('visual', elaborated.visual);
      setSpec('audio', elaborated.audio);
      internalActions.persistSpec();
    });
    return true;
  };

  if (sharedSpec) {
    importExportableSpec(sharedSpec).then((success) => {
      if (!success) {
        console.warn('Failed to load the spec shared via URL: the spec is invalid or its data source could not be resolved.');
        // fall back to the normal startup flow (most recent or first example dataset)
        setSpec('data', 'name', DEFAULT_DATASET_NAME);
      }
    });
  }

  return <UmweltSpecContext.Provider value={[spec, actions]}>{props.children}</UmweltSpecContext.Provider>;
}

export function useUmweltSpec() {
  const context = useContext(UmweltSpecContext);
  if (context === undefined) {
    throw new Error('useUmweltSpec must be used within a UmweltSpecProvider');
  }
  return context;
}
