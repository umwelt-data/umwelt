import { createContext, useContext, ParentProps, createSignal, batch } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { AudioEncodingFieldDef, EncodingPropName, EncodingRef, ExportableSpec, InstrumentName, MeasureType, UmweltAggregateOp, UmweltSpec, UmweltTimeUnit, ViewComposition, VisualEncodingFieldDef, TextNode, TextPredicateNode, DATA_STRUCTURE_KEY, isAudioProp, isVisualProp, isExportableUmweltURLDataSource, defaultVisualUnitName, defaultAudioUnitName } from '../types';
import type { FieldPredicate, LogicalAnd } from '@umwelt-data/umwelt-utils/predicate';

// A text edit targets one structure, keyed by the visual unit it describes (or
// DATA_STRUCTURE_KEY for the whole dataset when there's no visualization).
export type TextTarget = string;
import { detectKey, elaborateFields } from '../util/inference';
import { decodeSpecFromString, elaborateExportableSpec, newTextNodeId, seedChartOverride, seedDataStructure } from '../util/spec';
import { Mark } from 'vega-lite/build/src/mark';
import { cleanData, DEFAULT_DATASET_NAME, typeCoerceData, resolveDataSource } from '../util/datasets';
import { useUmweltDatastore } from './UmweltDatastoreContext';
import { getDefaultSpec } from '../util/heuristics';

export type UmweltSpecProviderProps = ParentProps<{}>;

const CURRENT_SPEC_STORAGE_KEY = 'umweltCurrentSpec';

// --- In-place helpers for editing a TextNode tree --------------------------
// These mutate a `produce` draft. Editing in place (rather than rebuilding the
// path immutably) preserves node identities, so Solid's fine-grained reactivity
// updates only the changed leaf — the DOM node isn't recreated and a focused input
// keeps focus while you type.

// Find a node by id, returning the live (mutable) reference.
function findTextNode(nodes: TextNode[], nodeId: string): TextNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const found = findTextNode(node.children, nodeId);
    if (found) return found;
  }
  return undefined;
}

// The sibling array a node lives in, and its index — for splice-based ops.
function findSiblings(nodes: TextNode[], nodeId: string): { arr: TextNode[]; index: number } | undefined {
  const index = nodes.findIndex((n) => n.id === nodeId);
  if (index !== -1) return { arr: nodes, index };
  for (const node of nodes) {
    const found = findSiblings(node.children, nodeId);
    if (found) return found;
  }
  return undefined;
}

function newTextGroupNode(): TextNode {
  return { id: newTextNodeId(), nodeType: 'group', groupby: [{ field: '' }], children: [] };
}

function newTextPredicateNode(): TextNode {
  return { id: newTextNodeId(), nodeType: 'predicate', predicate: { and: [] }, name: '', children: [] };
}

// The authored predicate is always an AND of field conditions; returns the live
// `and` array so produce mutations (push/splice) land on the draft.
function predicateClauses(node: TextPredicateNode): FieldPredicate[] {
  const pred = node.predicate as LogicalAnd<FieldPredicate>;
  return Array.isArray(pred?.and) ? (pred.and as FieldPredicate[]) : [];
}

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
  changeInstrument: (unit: string, instrument: InstrumentName | undefined) => void;
  addVisualUnit: () => void;
  removeVisualUnit: (unit: string) => void;
  addAudioUnit: () => void;
  removeAudioUnit: (unit: string) => void;
  renameUnit: (oldName: string, newName: string) => void;
  setComposition: (modality: 'visual' | 'audio', composition: ViewComposition) => void;
  reorderTraversal: (unit: string, field: string, newIndex: number) => void;
  // text modality — a TextTarget is a structure key (visual unit name, or
  // DATA_STRUCTURE_KEY for the whole dataset when there is no visualization)
  resetTextStructure: (target: TextTarget) => void; // drop a structure → faithful inference
  addTextNode: (target: TextTarget, parentId: string | undefined, kind: 'group' | 'predicate') => void;
  removeTextNode: (target: TextTarget, nodeId: string) => void;
  reorderTextNode: (target: TextTarget, parentId: string | undefined, nodeId: string, newIndex: number) => void;
  // group nodes (groupby is an ordered list of fields; >1 = crossed grouping)
  setTextNodeField: (target: TextTarget, nodeId: string, index: number, field: string) => void;
  addTextNodeGroupField: (target: TextTarget, nodeId: string) => void;
  removeTextNodeGroupField: (target: TextTarget, nodeId: string, index: number) => void;
  setTextNodeType: (target: TextTarget, nodeId: string, index: number, type: MeasureType | 'undefined') => void;
  setTextNodeBin: (target: TextTarget, nodeId: string, index: number, bin: boolean) => void;
  setTextNodeTimeUnit: (target: TextTarget, nodeId: string, index: number, timeUnit: UmweltTimeUnit | 'undefined') => void;
  // predicate nodes (a named subset; predicate is an AND of field conditions)
  setTextNodeName: (target: TextTarget, nodeId: string, name: string) => void;
  setTextNodeReasoning: (target: TextTarget, nodeId: string, reasoning: string) => void;
  addTextPredicateClause: (target: TextTarget, nodeId: string) => void;
  removeTextPredicateClause: (target: TextTarget, nodeId: string, index: number) => void;
  setTextPredicateClause: (target: TextTarget, nodeId: string, index: number, clause: FieldPredicate) => void;
  setFieldAggregate: (field: string, aggregate: UmweltAggregateOp | 'undefined') => void;
  setFieldBin: (field: string, bin: boolean) => void;
  setFieldTimeUnit: (field: string, timeUnit: UmweltTimeUnit | 'undefined') => void;
  setEncodingType: (unit: string, property: EncodingPropName, type: MeasureType | 'undefined') => void;
  setEncodingAggregate: (unit: string, property: EncodingPropName, aggregate: UmweltAggregateOp | 'undefined') => void;
  setEncodingBin: (unit: string, property: EncodingPropName, bin: boolean) => void;
  setEncodingTimeUnit: (unit: string, property: EncodingPropName, timeUnit: UmweltTimeUnit | 'undefined') => void;
  setTraversalType: (unit: string, field: string, type: MeasureType | 'undefined') => void;
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
      text: { structures: {} },
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
        // default the text modality; a stale pre-reshape shape is discarded, not migrated
        if (!persistedSpec.text || !('structures' in persistedSpec.text)) {
          persistedSpec.text = { structures: {} };
        }
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

  // The seed shown in the editor for a not-yet-owned structure (deterministic ids,
  // so a first edit targets the same nodes the editor displayed).
  const seedFor = (target: TextTarget): TextNode[] => {
    const visUnit = spec.visual.units.find((u) => u.name === target);
    return visUnit ? seedChartOverride(visUnit, spec) : seedDataStructure(spec);
  };
  // Ensure a target's structure exists (seeded-then-owned): the first edit
  // materializes the seed so subsequent in-place edits have a concrete tree.
  const ensureTextOwned = (target: TextTarget) => {
    if (!spec.text.structures[target]) setSpec('text', 'structures', target, seedFor(target));
  };
  // Mutate a target's structure in place via produce (preserves node identities →
  // fine-grained updates → focused inputs keep focus), then persist.
  const editTextStructure = (target: TextTarget, mut: (structure: TextNode[]) => void) => {
    ensureTextOwned(target);
    setSpec('text', 'structures', target, produce(mut));
    internalActions.persistSpec();
  };
  const editTextNode = (target: TextTarget, nodeId: string, mut: (node: TextNode) => void) => {
    editTextStructure(target, (structure) => {
      const node = findTextNode(structure, nodeId);
      if (node) mut(node);
    });
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
          setSpec('text', { structures: {} });
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
    changeInstrument: (unit: string, instrument: InstrumentName | undefined) => {
      setSpec(
        'audio',
        'units',
        spec.audio.units.map((u) => (u.name === unit ? { ...u, instrument } : u))
      );
      internalActions.persistSpec();
    },
    addVisualUnit: () => {
      let name = defaultVisualUnitName(visualUnitCount());
      while (spec.visual.units.find((u) => u.name === name)) {
        setVisualUnitCount(visualUnitCount() + 1);
        name = defaultVisualUnitName(visualUnitCount());
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
      let name = defaultAudioUnitName(audioUnitCount());
      while (spec.audio.units.find((u) => u.name === name)) {
        setAudioUnitCount(audioUnitCount() + 1);
        name = defaultAudioUnitName(audioUnitCount());
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
    // --- Text modality -----------------------------------------------------
    // Drop a structure so its view reverts to olli's faithful inference.
    resetTextStructure: (target: TextTarget) => {
      setSpec('text', 'structures', (structures) => {
        const { [target]: _, ...rest } = structures;
        return rest;
      });
      internalActions.persistSpec();
    },
    addTextNode: (target: TextTarget, parentId: string | undefined, kind: 'group' | 'predicate') => {
      const node = kind === 'predicate' ? newTextPredicateNode() : newTextGroupNode();
      editTextStructure(target, (structure) => {
        const siblings = parentId === undefined ? structure : findTextNode(structure, parentId)?.children;
        siblings?.push(node);
      });
    },
    removeTextNode: (target: TextTarget, nodeId: string) => {
      editTextStructure(target, (structure) => {
        const found = findSiblings(structure, nodeId);
        found?.arr.splice(found.index, 1);
      });
    },
    reorderTextNode: (target: TextTarget, _parentId: string | undefined, nodeId: string, newIndex: number) => {
      editTextStructure(target, (structure) => {
        const found = findSiblings(structure, nodeId);
        if (!found || newIndex < 0 || newIndex >= found.arr.length) return;
        const [moved] = found.arr.splice(found.index, 1);
        found.arr.splice(newIndex, 0, moved);
      });
    },
    // group nodes ----------------------------------------------------------
    setTextNodeField: (target: TextTarget, nodeId: string, index: number, field: string) => {
      editTextNode(target, nodeId, (node) => node.nodeType === 'group' && (node.groupby[index].field = field));
    },
    addTextNodeGroupField: (target: TextTarget, nodeId: string) => {
      editTextNode(target, nodeId, (node) => node.nodeType === 'group' && node.groupby.push({ field: '' }));
    },
    removeTextNodeGroupField: (target: TextTarget, nodeId: string, index: number) => {
      editTextNode(target, nodeId, (node) => node.nodeType === 'group' && node.groupby.length > 1 && node.groupby.splice(index, 1));
    },
    setTextNodeType: (target: TextTarget, nodeId: string, index: number, inputType: MeasureType | 'undefined') => {
      const type = inputType === 'undefined' ? undefined : inputType;
      editTextNode(target, nodeId, (node) => node.nodeType === 'group' && (node.groupby[index].type = type));
    },
    setTextNodeBin: (target: TextTarget, nodeId: string, index: number, bin: boolean) => {
      editTextNode(target, nodeId, (node) => node.nodeType === 'group' && (node.groupby[index].bin = bin));
    },
    setTextNodeTimeUnit: (target: TextTarget, nodeId: string, index: number, inputTimeUnit: UmweltTimeUnit | 'undefined') => {
      const timeUnit = inputTimeUnit === 'undefined' ? undefined : inputTimeUnit;
      editTextNode(target, nodeId, (node) => node.nodeType === 'group' && (node.groupby[index].timeUnit = timeUnit));
    },
    // predicate nodes ------------------------------------------------------
    setTextNodeName: (target: TextTarget, nodeId: string, name: string) => {
      editTextNode(target, nodeId, (node) => node.nodeType === 'predicate' && (node.name = name));
    },
    setTextNodeReasoning: (target: TextTarget, nodeId: string, reasoning: string) => {
      editTextNode(target, nodeId, (node) => node.nodeType === 'predicate' && (node.reasoning = reasoning || undefined));
    },
    addTextPredicateClause: (target: TextTarget, nodeId: string) => {
      const firstField = spec.fields.find((f) => f.active)?.name ?? '';
      const clause: FieldPredicate = { field: firstField, equal: '' };
      editTextNode(target, nodeId, (node) => node.nodeType === 'predicate' && predicateClauses(node).push(clause));
    },
    removeTextPredicateClause: (target: TextTarget, nodeId: string, index: number) => {
      editTextNode(target, nodeId, (node) => node.nodeType === 'predicate' && predicateClauses(node).splice(index, 1));
    },
    setTextPredicateClause: (target: TextTarget, nodeId: string, index: number, clause: FieldPredicate) => {
      editTextNode(target, nodeId, (node) => {
        if (node.nodeType !== 'predicate') return;
        // replace the clause's CONTENTS in place (keeping its object identity) so the
        // condition row isn't recreated and its focused value input keeps focus
        const draft = predicateClauses(node)[index] as unknown as Record<string, unknown> | undefined;
        if (!draft) return;
        for (const k of Object.keys(draft)) delete draft[k];
        Object.assign(draft, clause);
      });
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
    // per-channel measure-type override
    setEncodingType: (unit: string, property: EncodingPropName, inputType: MeasureType | 'undefined') => {
      const type = inputType === 'undefined' ? undefined : inputType;
      if (isVisualProp(property) && spec.visual.units.find((u) => u.name === unit)) {
        setSpec(
          'visual',
          'units',
          spec.visual.units.map((u) => (u.name === unit ? { ...u, encoding: { ...u.encoding, [property]: { ...(u.encoding[property] as VisualEncodingFieldDef), type } } } : u))
        );
        internalActions.persistSpec();
      } else if (isAudioProp(property) && spec.audio.units.find((u) => u.name === unit)) {
        setSpec(
          'audio',
          'units',
          spec.audio.units.map((u) => (u.name === unit ? { ...u, encoding: { ...u.encoding, [property]: { ...(u.encoding[property] as AudioEncodingFieldDef), type } } } : u))
        );
        internalActions.persistSpec();
      }
    },
    setTraversalType: (unit: string, field: string, inputType: MeasureType | 'undefined') => {
      const type = inputType === 'undefined' ? undefined : inputType;
      setSpec(
        'audio',
        'units',
        spec.audio.units.map((u) => (u.name === unit ? { ...u, traversal: u.traversal.map((t) => (t.field === field ? { ...t, type } : t)) } : u))
      );
      internalActions.persistSpec();
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
      setSpec('text', elaborated.text);
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
