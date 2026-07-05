import { type OlliVisSpec, type OlliNode, type OlliTimeUnit, type UnitOlliVisSpec, isMultiSpec } from 'olli';
import { VegaLiteAdapter } from 'olli/adapters';
import { UmweltSpec, VlSpec, UmweltDataset, NONE, ExportableSpec, EncodingFieldDef, FieldDef, ResolvedFieldDef, isVisualProp, ExportableFieldDef, EncodingRef, isExportableUmweltURLDataSource, ExportableUmweltDataSource, AudioUnitSpec, TextNode, TextFieldRef, VisualUnitSpec, MeasureType, DATA_STRUCTURE_KEY } from '../types';
import { getDomain } from './domain';
import cloneDeep from 'lodash.clonedeep';
import { withExternalStateParam } from '@umwelt-data/umwelt-utils/vl-bridge';
import LZString from 'lz-string';
import { UmweltDatastore, UmweltDatastoreEntry } from '../contexts/UmweltDatastoreContext';
import { cleanData, DEFAULT_DATASET_NAME, EXAMPLE_DATASETS, resolveDataSource, typeCoerceData } from './datasets';

export function getFieldDef(spec: UmweltSpec, field: string | undefined) {
  return spec.fields.find((f) => f.name === field);
}

export function resolveFieldDef(specFieldDef: FieldDef, encFieldDef?: EncodingFieldDef): ResolvedFieldDef {
  const { active, name, encodings, ...fieldDef } = specFieldDef;
  const resolvedFieldDef = encFieldDef
    ? {
        ...fieldDef,
        ...encFieldDef,
      }
    : { field: name, ...fieldDef };
  // TODO fix type jank
  // remember, filter has to be after spread so that NONE can overwrite other values
  return Object.fromEntries(Object.entries(resolvedFieldDef).filter(([k, v]) => v !== NONE)) as unknown as ResolvedFieldDef;
}

// Resolve the field definitions an audio unit actually uses — one entry per
// encoding and traversal reference, so a field encoded and traversed with
// different transforms (e.g. count encoding + binned traversal of the same
// field) contributes both resolutions. Unused fields must stay out of this
// list: every untransformed field in it becomes a groupby column when the
// unit aggregates.
export function resolveAudioUnitFields(spec: UmweltSpec, unitSpec: AudioUnitSpec): ResolvedFieldDef[] {
  const usages: EncodingFieldDef[] = [...Object.values(unitSpec.encoding), ...unitSpec.traversal];
  const resolved = usages.flatMap((encFieldDef) => {
    const fieldDef = getFieldDef(spec, encFieldDef.field);
    return fieldDef ? [resolveFieldDef(fieldDef, encFieldDef)] : [];
  });
  const seen = new Set<string>();
  return resolved.filter((def) => {
    const key = JSON.stringify(def);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function decodeSpecFromString(specString: string): ExportableSpec | undefined {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(specString);
    if (!decompressed) {
      return undefined;
    }
    return JSON.parse(decompressed);
  } catch (e) {
    console.warn('Failed to decode spec:', e);
    return undefined;
  }
}

export async function validateSpecAsync(spec: ExportableSpec, datastore: UmweltDatastore, setDataset: (name: string, data: UmweltDataset, sourceUrl?: string) => void): Promise<UmweltSpec | undefined> {
  if (!spec.data) {
    return undefined;
  }
  if (!(spec.fields && spec.fields.length)) {
    return undefined;
  }

  // if this datastore already holds the data (e.g. a re-render), skip resolution
  const dataName = spec.data.name;
  if (dataName && datastore[dataName]?.data?.length) {
    return elaborateExportableSpec(spec);
  }

  const resolved = await resolveDataSource(spec.data);
  if (!resolved) {
    return undefined;
  }
  // coerce and clean against the spec's field types, mirroring the editor's
  // import path — otherwise e.g. numeric years in temporal fields stay numbers
  const elaborated = elaborateExportableSpec(spec);
  const typedData = typeCoerceData(resolved.data, elaborated.fields);
  const cleanedData = cleanData(typedData, elaborated.fields);
  if (!cleanedData.length) {
    return undefined;
  }
  setDataset(resolved.name, cleanedData, resolved.sourceUrl);

  return elaborated;
}

export function elaborateExportableSpec(spec: ExportableSpec): UmweltSpec {
  // add encoding refs back to fields
  const fields: FieldDef[] = spec.fields.map((field) => {
    const encodings: EncodingRef[] = [];
    spec.visual.units.forEach((unit) => {
      Object.entries(unit.encoding).forEach(([channel, encoding]) => {
        if (isVisualProp(channel) && encoding.field === field.name) {
          encodings.push({ unit: unit.name, property: channel });
        }
      });
    });
    spec.audio.units.forEach((unit) => {
      Object.entries(unit.encoding).forEach(([channel, encoding]) => {
        if (channel === 'pitch' && encoding.field === field.name) {
          encodings.push({ unit: unit.name, property: channel });
        }
      });
    });
    return { ...field, active: true, encodings };
  });
  const newSpec: UmweltSpec = {
    ...spec,
    data: {
      name: spec.data.name || (isExportableUmweltURLDataSource(spec.data) ? spec.data.url.split('/').pop() : DEFAULT_DATASET_NAME) || DEFAULT_DATASET_NAME,
    },
    fields,
    visual: { units: spec.visual.units, composition: spec.visual.composition || 'layer' },
    audio: { units: spec.audio.units, composition: spec.audio.composition || 'concat' },
    // regenerate node ids on import so a serialized id can never collide with one
    // this session's counter later mints
    text: {
      structures: spec.text?.structures ? Object.fromEntries(Object.entries(spec.text.structures).map(([k, v]) => [k, v.map(reidTextNode)])) : {},
    },
  };
  return newSpec;
}

export function umweltToVegaLiteSpec(spec: UmweltSpec, data: UmweltDataset): VlSpec | undefined {
  if (spec.visual.units.length === 0) {
    return undefined;
  }

  const countEncodings = spec.visual.units
    .map((unit) => {
      return Object.values(unit.encoding).length;
    })
    .reduce((a, b) => a + b, 0);

  if (countEncodings === 0) return undefined;

  const params: any = [
    {
      name: 'brush',
      select: 'interval',
    },
  ];

  function compileUnits(spec: UmweltSpec): any {
    const units = spec.visual.units;

    if (units.length === 1) {
      const unit = units[0];
      const encoding = cloneDeep(unit.encoding);
      if (encoding) {
        Object.keys(encoding).forEach((channel) => {
          if (isVisualProp(channel)) {
            const encDef = encoding[channel];
            if (encDef) {
              const specFieldDef = getFieldDef(spec, encDef.field);
              if (specFieldDef) {
                const resolvedFieldDef = resolveFieldDef(specFieldDef, encDef);
                encoding[channel] = {
                  ...resolvedFieldDef,
                };
                if (channel === 'facet') {
                  const domain = getDomain(resolvedFieldDef, data);
                  encoding[channel] = {
                    ...resolvedFieldDef,
                    columns: domain.length === 3 ? 3 : 2, // TODO do something better
                  } as any;
                }
                if (unit.mark === 'point') {
                  if ((channel === 'x' || channel === 'y') && resolvedFieldDef.type === 'quantitative') {
                    encoding[channel] = {
                      ...resolvedFieldDef,
                      scale: {
                        ...resolvedFieldDef.scale,
                        zero: false,
                      },
                    };
                  }
                }
              }
            }
          }
        });
      }
      return {
        mark: unit.mark,
        encoding: {
          ...encoding,
          color: {
            ...condition({ ...(encoding.color || { value: 'navy' }), scale: unit.mark === 'area' ? { scheme: 'category20b' } : undefined }, 'brush', 'grey'),
          },
        },
      };
    } else if (units.length > 1) {
      const op = spec.visual.composition || 'layer';
      return {
        columns: op === 'concat' ? (units.length < 3 ? 1 : 2) : undefined,
        [op]: units.map((unit, idx) => {
          const compiled = compileUnits({
            ...spec,
            visual: {
              units: [unit],
              composition: op,
            },
          });
          if (idx === 0) {
            compiled['params'] = params;
          }
          return compiled;
        }),
      };
    }
  }

  if (spec.visual.units[0].mark === 'line' || spec.visual.units[0].mark === 'bar') {
    const unit = spec.visual.units[0];
    const yField = unit.encoding.y?.field;
    const xField = unit.encoding.x?.field;
    const yFieldDef = getFieldDef(spec, yField);
    const xFieldDef = getFieldDef(spec, xField);
    if (yFieldDef?.type === 'quantitative' && xFieldDef?.type !== 'quantitative') {
      params[0]['select'] = { type: 'interval', encodings: ['x'] };
    } else if (xFieldDef?.type === 'quantitative' && yFieldDef?.type !== 'quantitative') {
      params[0]['select'] = { type: 'interval', encodings: ['y'] };
    }
  }

  const condition = (encoding: any, paramName: string, value: any, empty?: boolean) => {
    const condition = { param: paramName, empty: empty || true, ...encoding };
    return {
      condition,
      value,
    };
    // return encoding; // TODO
  };

  const compiled = compileUnits(spec);
  let vlSpec: VlSpec;
  if ('mark' in compiled) {
    vlSpec = cloneDeep({
      data: { values: data },
      params,
      ...compiled,
    });
  } else {
    vlSpec = cloneDeep({
      data: { values: data },
      ...compiled,
    });
  }
  return withExternalStateParam(vlSpec as unknown as Record<string, unknown>) as unknown as VlSpec;
}

export async function umweltToOlliSpec(spec: UmweltSpec, data: UmweltDataset): Promise<OlliVisSpec> {
  let olliSpec: OlliVisSpec;
  // Capture the reactive text inputs synchronously, before the await below. A
  // caller running this inside a reactive scope (e.g. the viewer's createEffect)
  // only tracks reads that happen before the first await; reads after it escape
  // tracking. Hoisting these is what makes a text edit re-run the viewer without a
  // manual dependency touch at the call site.
  const structures = spec.text.structures;
  const visUnitNames = spec.visual.units.map((u) => u.name);
  // Deep-read the authored structures synchronously so the viewer's effect re-runs
  // on any edit. The reads that actually apply them happen after the await below and
  // would otherwise escape tracking; a leaf edit (in-place via produce) also doesn't
  // change any array reference, so a shallow read wouldn't catch it. The olli output
  // depends on every node, so a full deep read is the honest dependency.
  JSON.stringify(structures);
  const textFieldTypes = new Map<string, MeasureType | undefined>(spec.fields.map((f) => [f.name, f.type]));
  const vlSpec = umweltToVegaLiteSpec(spec, data);
  if (vlSpec) {
    olliSpec = await VegaLiteAdapter(vlSpec);
  } else {
    olliSpec = {
      data: data as any,
      fields: [],
    };
  }

  if (isMultiSpec(olliSpec)) {
    olliSpec.units.forEach((unit) => {
      handleUnitSpec(unit, spec);
    });
  } else {
    handleUnitSpec(olliSpec, spec);
  }

  // Apply each view's authored structure, if owned. A chart view keeps its
  // mark/axes/legends, so the chart's own groupings read in visualization language
  // and user-added groupings on other fields read plainly. Views without an authored
  // structure keep olli's faithful inference. vlSpec is truthy iff a chart compiled.
  if (vlSpec) {
    const visViews = isMultiSpec(olliSpec) ? olliSpec.units : [olliSpec];
    visViews.forEach((view, i) => {
      const s = structures[visUnitNames[i]];
      if (s?.length) applyTextStructure(view, s, textFieldTypes);
    });
  } else {
    // no chart: the single bare unit describes the raw data; apply its structure if owned
    const s = structures[DATA_STRUCTURE_KEY];
    if (s?.length) applyTextStructure(olliSpec as UnitOlliVisSpec, s, textFieldTypes);
  }

  function handleUnitSpec(olliSpec: UnitOlliVisSpec, spec: UmweltSpec) {
    if (olliSpec.fields?.length === 0) {
      delete olliSpec.mark;
      delete olliSpec.axes;
      delete olliSpec.legends;
    }
    if (olliSpec.fields) {
      spec.fields
        .filter((f) => f.active)
        .forEach((field) => {
          // if field is not in olliSpec.fields, add it
          if (!olliSpec.fields?.find((f) => f.field === field.name)) {
            olliSpec.fields?.push({
              ...field,
              field: field.name,
              timeUnit: field.timeUnit as OlliTimeUnit,
            });
          }
        });
    }
  }

  return olliSpec;
}

// --- Text structure: lowering + seeding ------------------------------------

let textNodeIdCounter = 0;
export function newTextNodeId(): string {
  return `text_node_${textNodeIdCounter++}`;
}

// Deep-copy a text node with a fresh id (and fresh child ids). Used on import so
// serialized ids never clash with ids the session counter later mints.
function reidTextNode(node: TextNode): TextNode {
  return { ...node, id: newTextNodeId(), children: node.children.map(reidTextNode) };
}

// Coerce predicate leaf values to the runtime types olli/vega compare against.
// Authored temporal values are JSON-safe strings (fresh ones may already be
// Dates); JSON export→import loses the Date, so re-coerce here at the boundary.
function coercePredicateForOlli(pred: any, fieldTypes: Map<string, MeasureType | undefined>): any {
  if (!pred || typeof pred !== 'object') return pred;
  if ('and' in pred) return { and: pred.and.map((p: any) => coercePredicateForOlli(p, fieldTypes)) };
  if ('or' in pred) return { or: pred.or.map((p: any) => coercePredicateForOlli(p, fieldTypes)) };
  if ('not' in pred) return { not: coercePredicateForOlli(pred.not, fieldTypes) };
  if ('field' in pred && fieldTypes.get(pred.field) === 'temporal') {
    const toDate = (v: any) => (v instanceof Date || v == null ? v : new Date(v));
    const next = { ...pred };
    for (const op of ['equal', 'lt', 'lte', 'gt', 'gte'] as const) {
      if (op in next) next[op] = toDate(next[op]);
    }
    if ('range' in next && Array.isArray(next.range)) next.range = next.range.map(toDate);
    if ('oneOf' in next && Array.isArray(next.oneOf)) next.oneOf = next.oneOf.map(toDate);
    return next;
  }
  return pred;
}

// Lower one umwelt TextNode to an olli OlliNode (drops the editor-only `id`).
// `resolveRef` maps a group field ref to the olli column it should group by —
// the real field name, or a derived column when the same field is grouped with
// more than one signature (see applyTextStructure).
function textNodeToOlliNode(node: TextNode, fieldTypes: Map<string, MeasureType | undefined>, resolveRef: (ref: TextFieldRef) => string): OlliNode {
  const children = node.children.map((c) => textNodeToOlliNode(c, fieldTypes, resolveRef));
  if (node.nodeType === 'group') {
    const fields = node.groupby.map(resolveRef);
    const groupby = fields.length === 1 ? fields[0] : fields;
    return { groupby, ...(children.length ? { children } : {}) };
  }
  return {
    predicate: coercePredicateForOlli(node.predicate, fieldTypes),
    ...(node.name ? { name: node.name } : {}),
    ...(node.reasoning ? { reasoning: node.reasoning } : {}),
    ...(children.length ? { children } : {}),
  };
}

// The effective grouping signature of a field ref: its own type/timeUnit/bin,
// falling back to the field's base olli field def. This is what olli grouping
// keys on (mainly type: ordinal → per-value, quantitative/temporal → range bins).
interface GroupSig {
  type?: MeasureType;
  timeUnit?: OlliTimeUnit;
  bin: boolean;
}
function effectiveSig(ref: TextFieldRef, base: any): GroupSig {
  return {
    type: (ref.type as MeasureType) ?? base?.type,
    timeUnit: ref.timeUnit === NONE ? undefined : ((ref.timeUnit as OlliTimeUnit) ?? base?.timeUnit),
    bin: ref.bin !== undefined ? ref.bin : !!base?.bin,
  };
}
const sigKey = (s: GroupSig) => `${s.type ?? ''}|${s.timeUnit ?? ''}|${s.bin ? 'bin' : ''}`;

// Apply an authored text unit's structure onto an olli unit spec, replacing the
// inferred structure. olli resolves field defs — and their grouping behavior —
// by field NAME, so a field grouped with two different signatures across
// branches cannot be honored on the single shared field def. We resolve this by
// materializing a distinct derived column (a copy of the raw field with its own
// field def) for each non-primary signature; the primary signature (the field's
// base def, else the first seen) keeps the real field name so it still
// coordinates with other views on brush.
function applyTextStructure(olliUnit: UnitOlliVisSpec, structure: TextNode[], fieldTypes: Map<string, MeasureType | undefined>) {
  const fields = olliUnit.fields ?? (olliUnit.fields = []);
  const data = (olliUnit.data ?? []) as Record<string, any>[];
  const baseDef = (field: string) => fields.find((f) => f.field === field);

  // 1. Collect the distinct signatures each field is grouped with.
  const usedByField = new Map<string, Map<string, GroupSig>>();
  const collect = (nodes: TextNode[]) =>
    nodes.forEach((node) => {
      if (node.nodeType === 'group') {
        node.groupby.forEach((ref) => {
          const sig = effectiveSig(ref, baseDef(ref.field));
          const byKey = usedByField.get(ref.field) ?? new Map<string, GroupSig>();
          byKey.set(sigKey(sig), sig);
          usedByField.set(ref.field, byKey);
        });
      }
      collect(node.children);
    });
  collect(structure);

  // 2. Resolve each (field, signature) to a column name, deriving where needed.
  const resolved = new Map<string, string>();
  usedByField.forEach((sigs, field) => {
    const base = baseDef(field);
    const baseKey = base ? sigKey({ type: base.type as MeasureType, timeUnit: base.timeUnit as OlliTimeUnit, bin: !!base.bin }) : undefined;
    const keys = [...sigs.keys()];
    const primaryKey = baseKey && sigs.has(baseKey) ? baseKey : keys[0];
    sigs.forEach((sig, key) => {
      if (key === primaryKey) {
        // real field name; write the chosen signature onto the real field def
        if (base) {
          if (sig.type) base.type = sig.type;
          base.timeUnit = sig.timeUnit;
          base.bin = sig.bin || undefined;
        }
        resolved.set(`${field}|${key}`, field);
      } else {
        // derived column: a copy of the raw field with its own field def
        const parts = [sig.type, sig.timeUnit, sig.bin ? 'bin' : ''].filter(Boolean);
        const col = `${field}__${parts.join('_') || 'raw'}`;
        resolved.set(`${field}|${key}`, col);
        if (!fields.find((f) => f.field === col)) {
          // label keeps olli's node/guide text on the real field name, not the derived column
          fields.push({ field: col, label: field, type: sig.type ?? (fieldTypes.get(field) as MeasureType), timeUnit: sig.timeUnit, bin: sig.bin || undefined });
        }
        data.forEach((d) => {
          if (field in d && !(col in d)) d[col] = d[field];
        });
      }
    });
  });

  const resolveRef = (ref: TextFieldRef) => resolved.get(`${ref.field}|${sigKey(effectiveSig(ref, baseDef(ref.field)))}`) ?? ref.field;
  olliUnit.structure = structure.map((node) => textNodeToOlliNode(node, fieldTypes, resolveRef));
}

// Assign deterministic, position-based ids to a freshly built tree. The seed is
// pure (same encodings → same tree), so this makes repeated seedChartOverride calls
// return identical ids — essential because the editor displays the seed for a
// not-yet-owned view while the context re-seeds on the first edit; mismatched ids
// would make that edit target a nonexistent node.
function assignSeedIds(nodes: TextNode[], prefix: string): TextNode[] {
  return nodes.map((n, i) => ({ ...n, id: `${prefix}_${i}`, children: assignSeedIds(n.children, `${prefix}_${i}`) }));
}

// Seed a chart-description structure that mirrors what olli currently infers from a
// visual unit's encodings (a replica of olli's inferStructure): one sibling grouping
// per guide, with facet / line-color introducing a nesting level. Used to populate a
// view's editable override the moment the user takes it over.
// TODO(drift): olli >3.1.3 now exports `inferStructure`. Once umwelt is on that
// release, replace this hand-rolled replica by building a minimal UnitOlliVisSpec
// (axes/legends/guides/facet/mark/fields from the encodings — all available
// synchronously) and calling `inferStructure`, lifting its OlliNode[] to
// TextNode[]. That removes the drift between this seed and what olli actually
// infers (see the scatterplot case handled below, which this replica once missed).
export function seedChartOverride(unit: VisualUnitSpec, spec: UmweltSpec): TextNode[] {
  return assignSeedIds(buildSeed(unit, spec), 'seed');
}

function buildSeed(unit: VisualUnitSpec, spec: UmweltSpec): TextNode[] {
  const enc = unit.encoding;
  const fieldOf = (ch: string): string | undefined => (enc as any)[ch]?.field;
  const typeOf = (field: string | undefined) => getFieldDef(spec, field)?.type;
  const binnedOf = (field: string | undefined) => !!getFieldDef(spec, field)?.bin;

  const group = (field: string, children: TextNode[] = []): TextNode => ({
    id: '', // replaced by assignSeedIds
    nodeType: 'group',
    groupby: [{ field }],
    children,
  });

  const axisFields = ['x', 'y'].map(fieldOf).filter((f): f is string => !!f);
  const legendFields = ['color', 'size', 'opacity', 'shape'].map(fieldOf).filter((f): f is string => !!f);
  const facetField = fieldOf('facet');

  const dedupe = (fields: string[]) => Array.from(new Set(fields));
  const guideNodes = (fields: string[]) => dedupe(fields).map((f) => group(f));

  if (facetField) {
    return [group(facetField, guideNodes([...axisFields, ...legendFields]))];
  }
  // multi-series line: nest the series (color) over the axes
  if (unit.mark === 'line' && legendFields.length) {
    const [series, ...restLegends] = legendFields;
    return [group(series, guideNodes([...axisFields, ...restLegends]))];
  }
  // bar: drop the (unbinned) quantitative measure axis; group by the rest
  if (unit.mark === 'bar') {
    const kept = [...axisFields, ...legendFields].filter((f) => !(typeOf(f) === 'quantitative' && !binnedOf(f)));
    if (kept.length) return guideNodes(kept);
  }
  // otherwise (incl. scatterplots), group by every guide — matching olli's
  // inferStructure, which groups quantitative axes too (olli bins them). An earlier
  // filter here excluded unbinned quantitative guides and seeded scatterplots empty.
  const guides = [...axisFields, ...legendFields];
  if (guides.length) return guideNodes(guides);
  return [];
}

// Seed for the no-visualization case: one sibling grouping per active field,
// matching olli's field-list fallback. Deterministic ids, as for seedChartOverride.
export function seedDataStructure(spec: UmweltSpec): TextNode[] {
  const nodes: TextNode[] = spec.fields
    .filter((f) => f.active)
    .map((f) => ({ id: '', nodeType: 'group' as const, groupby: [{ field: f.name }], children: [] }));
  return assignSeedIds(nodes, 'seed');
}

export function exportableSpec(spec: UmweltSpec, datastore: UmweltDatastore): ExportableSpec {
  const { fields, data: _data, visual, audio, text, ...rest } = spec;
  const exportableFields: ExportableFieldDef[] = fields
    .filter((field) => field.active)
    .map((field) => {
      const { encodings, active, ...rest } = field;
      return rest;
    });

  // composition only matters with multiple units
  const exportableVisual = visual.units.length > 1 ? visual : { units: visual.units };
  const exportableAudio = audio.units.length > 1 ? audio : { units: audio.units };
  // serialize text only when some structure is authored
  const exportableText = Object.keys(text.structures).length > 0 ? { structures: text.structures } : undefined;

  // Most compact data source that can be resolved on import:
  // example dataset name > source URL > embedded values.
  // Constructed so that `data` serializes last, keeping embedded values from burying the rest of the spec.
  const entry = datastore[spec.data.name];
  const exampleUrl = EXAMPLE_DATASETS[spec.data.name];
  let data: ExportableUmweltDataSource;
  if (exampleUrl && (!entry?.sourceUrl || entry.sourceUrl === exampleUrl)) {
    data = { name: spec.data.name };
  } else if (entry?.sourceUrl) {
    data = { name: spec.data.name, url: entry.sourceUrl };
  } else {
    data = { name: spec.data.name, values: entry?.data || [] };
  }

  return { ...rest, visual: exportableVisual, audio: exportableAudio, ...(exportableText ? { text: exportableText } : {}), fields: exportableFields, data };
}

export function prettyPrintSpec(spec: UmweltSpec | ExportableSpec): string {
  return JSON.stringify(spec, null, 2);
}

export function compressedSpec(spec: UmweltSpec, datastore: UmweltDatastore): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(exportableSpec(spec, datastore)));
}

export function shareSpecURL(spec: UmweltSpec, datastore: UmweltDatastore): string {
  const specString = compressedSpec(spec, datastore);
  // spec goes in the hash fragment so it is never sent to the server
  const url = new URL(window.location.href);
  url.hash = `spec=${specString}`;
  return url.toString();
}
