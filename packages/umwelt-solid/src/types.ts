import { Mark } from 'vega-lite/build/src/mark';
import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite/build/src/spec';
import { Sort } from 'vega-lite/build/src/sort';
import type { LogicalComposition, FieldPredicate } from '@umwelt-data/umwelt-utils/predicate';
import type { DataValue, Datum, Dataset, MeasureType as SharedMeasureType } from '@umwelt-data/umwelt-utils/data';
import { AggregateTransform, BinTransform, TimeUnitTransform } from 'vega-lite/build/src/transform';

export type VlSpec = TopLevelSpec;
export type VgSpec = Spec;

export type UmweltValue = DataValue;
export type UmweltDatum = Datum;
export type UmweltDataset = Dataset;

export type UmweltTransform = AggregateTransform | BinTransform | TimeUnitTransform;

export const aggregateOps = ['mean', 'median', 'min', 'max', 'sum', 'count'] as const;
export type UmweltAggregateOp = (typeof aggregateOps)[number];
export function isUmweltAggregateOp(op?: string): op is UmweltAggregateOp {
  return aggregateOps.includes(op as UmweltAggregateOp);
}

export const timeUnits = ['year', 'quarter', 'month', 'yearmonth', 'day', 'date', 'hours', 'minutes', 'seconds'] as const;
export type UmweltTimeUnit = (typeof timeUnits)[number];
export function isUmweltTimeUnit(unit?: string): unit is UmweltTimeUnit {
  return timeUnits.includes(unit as UmweltTimeUnit);
}

type ScaleDomain = {
  domain?: UmweltValue[];
  zero?: boolean;
  nice?: boolean | number;
}; //  | "type"
type ScaleRange = {
  range?: number[] | string[];
}; //  | "reverse"

export type MeasureType = SharedMeasureType;

export interface UmweltDataSource {
  name: string;
}

export interface ExportableUmweltValuesDataSource {
  name?: string;
  values: UmweltDataset;
}

export function isExportableUmweltValuesDataSource(dataSource: any): dataSource is ExportableUmweltValuesDataSource {
  return dataSource && (typeof dataSource.name === 'string' || dataSource.name === undefined) && Array.isArray(dataSource.values);
}

export interface ExportableUmweltURLDataSource {
  name?: string;
  url: string;
}

export function isExportableUmweltURLDataSource(dataSource: any): dataSource is ExportableUmweltURLDataSource {
  return dataSource && (typeof dataSource.name === 'string' || dataSource.name === undefined) && typeof dataSource.url === 'string';
}

// name-only source; resolved against the built-in example dataset registry (EXAMPLE_DATASETS)
export interface ExportableUmweltNameDataSource {
  name: string;
}

export function isExportableUmweltNameDataSource(dataSource: any): dataSource is ExportableUmweltNameDataSource {
  return dataSource && typeof dataSource.name === 'string' && !isExportableUmweltValuesDataSource(dataSource) && !isExportableUmweltURLDataSource(dataSource);
}

export type ExportableUmweltDataSource = ExportableUmweltValuesDataSource | ExportableUmweltURLDataSource | ExportableUmweltNameDataSource;

export type UmweltPredicate = LogicalComposition<FieldPredicate>;

export const visualPropNames = ['x', 'y', 'color', 'shape', 'size', 'opacity', 'order', 'facet'] as const;
export const audioPropNames = ['pitch', 'duration', 'volume', 'pan'] as const;

export type VisualPropName = (typeof visualPropNames)[number];
export type AudioPropName = (typeof audioPropNames)[number];
export type EncodingPropName = VisualPropName | AudioPropName;

export const markTypes = ['point', 'line', 'bar', 'area'];
export type MarkType = (typeof markTypes)[number];

// Instrument presets for an audio unit — the audio analog of a visual `mark`: a
// timbre substrate carried by the whole unit, not a per-datum encoding. Ordered
// so layer auto-assignment picks maximally-distinct timbres first (see
// LAYER_INSTRUMENT_ORDER / instrumentForIndex). Every preset must sustain so it
// works in both discrete and ramped playback.
export const instrumentNames = ['pure', 'bright', 'hollow', 'bell', 'reed', 'strings'] as const;
export type InstrumentName = (typeof instrumentNames)[number];

export function isInstrumentName(name?: string): name is InstrumentName {
  return instrumentNames.includes(name as InstrumentName);
}

export function isVisualProp(propName: string): propName is VisualPropName {
  return visualPropNames.includes(propName as VisualPropName);
}

export function isAudioProp(propName: string): propName is AudioPropName {
  return audioPropNames.includes(propName as AudioPropName);
}

// need an explicit NONE value for transforms for when the field definition has a transform
// but the user wants to override it to NONE in the encoding definition
export const NONE = 'None';

export type FieldName = string;

export interface FieldRef {
  field: FieldName;
}

export interface ValueRef {
  value: UmweltValue;
}

export interface EncodingRef {
  property: EncodingPropName;
  unit: string;
}

export interface FieldDef {
  active: boolean; // is this field active in the editor
  name: FieldName;
  type?: MeasureType;
  encodings: EncodingRef[];
  //
  scale?: ScaleDomain;
  timeUnit?: UmweltTimeUnit;
  aggregate?: UmweltAggregateOp;
  bin?: boolean;
  sort?: Sort<any>;
}

export interface VisualEncodingFieldDef {
  field: FieldName;
  //
  /** overrides the field's measure type for this visual channel only
   * (e.g. render a temporal field as a nominal color scale) */
  type?: MeasureType;
  scale?: ScaleDomain & ScaleRange;
  timeUnit?: UmweltTimeUnit | typeof NONE;
  aggregate?: UmweltAggregateOp | typeof NONE;
  bin?: boolean;
  sort?: Sort<any>;
}

export interface AudioEncodingFieldDef {
  field: FieldName;
  //
  /** overrides the field's measure type for this audio channel only */
  type?: MeasureType;
  scale?: ScaleDomain & ScaleRange;
  timeUnit?: UmweltTimeUnit | typeof NONE;
  aggregate?: UmweltAggregateOp | typeof NONE;
  sort?: Sort<any>;
  bin?: undefined;
}

export type EncodingFieldDef = VisualEncodingFieldDef | AudioEncodingFieldDef | AudioTraversalFieldDef;

export type ResolvedFieldDef = Omit<FieldDef, 'active' | 'name' | 'encodings'> & EncodingFieldDef;

export interface AudioTraversalFieldDef {
  field: FieldName;
  //
  /** overrides the field's measure type for this traversal only */
  type?: MeasureType;
  scale?: ScaleDomain & ScaleRange;
  timeUnit?: UmweltTimeUnit | typeof NONE;
  bin?: boolean;
  aggregate?: undefined;
}

export type VisualEncoding = {
  [prop in VisualPropName]?: VisualEncodingFieldDef;
};

export type VisualUnitSpec = {
  name: string;
  mark: Mark;
  encoding: VisualEncoding;
};

export type AudioEncoding = {
  [prop in AudioPropName]?: AudioEncodingFieldDef;
};

export type AudioTraversal = AudioTraversalFieldDef[];

export type AudioUnitSpec = {
  name: string;
  // absent = the current default: `pure` for a lone unit, or an auto-assigned
  // distinct timbre per layer (see AudioLayerGroupContext).
  instrument?: InstrumentName;
  encoding: AudioEncoding;
  traversal: AudioTraversal;
};

export const viewCompositions = ['layer', 'concat'];
export type ViewComposition = (typeof viewCompositions)[number];

export interface VisualSpec {
  units: VisualUnitSpec[];
  composition: ViewComposition;
}

export interface AudioSpec {
  units: AudioUnitSpec[];
  composition: ViewComposition;
}

// --- Text modality ---------------------------------------------------------
//
// The text modality authors an accessible, navigable *structure* over the data
// (rendered by olli). It deliberately does NOT reuse the encoding-channel model:
// olli is about structure, not encodings. Instead a text unit holds a tree of
// TextNodes that umwelt lowers to olli's `OlliNode` structure at render time.
//
// We mirror olli's node shapes (group / predicate) rather than storing `OlliNode`
// directly, so that (a) group nodes can carry per-node transforms via umwelt's
// own field refs — olli's `groupby: string` cannot — and (b) the exported spec
// stays umwelt-owned and insulated from olli's type changes.

export type TextNodeId = string;

// A field reference inside a group node, carrying per-usage discretization
// (aggregate does not apply to grouping). `type` overrides the field's measure
// type for this grouping only — the main lever on how olli buckets it (ordinal
// → one branch per value; quantitative/temporal → range bins) — mirroring
// VisualEncodingFieldDef.type. When two refs to the same field carry different
// signatures, the lowering emits a distinct derived column per signature so olli
// (which resolves field defs by name) can honor each independently.
export interface TextFieldRef {
  field: FieldName;
  type?: MeasureType;
  timeUnit?: UmweltTimeUnit | typeof NONE;
  bin?: boolean;
}

// Group the data by one or more discretized fields (multiple = crossed grouping,
// lowering to olli's `groupby: string[]`).
export interface TextGroupNode {
  id: TextNodeId;
  nodeType: 'group';
  groupby: TextFieldRef[];
  children: TextNode[];
}

// A named, editorially-motivated subset that no field grouping can express
// (e.g. "cars after 1975"). Lowers to olli's OlliPredicateNode.
export interface TextPredicateNode {
  id: TextNodeId;
  nodeType: 'predicate';
  predicate: UmweltPredicate;
  name?: string;
  reasoning?: string;
  children: TextNode[];
}

export type TextNode = TextGroupNode | TextPredicateNode;

export function isTextGroupNode(node: TextNode): node is TextGroupNode {
  return node.nodeType === 'group';
}

// The text modality is one editable structure per view, keyed by visual unit name
// (or DATA_STRUCTURE_KEY when there is no visualization). Seeded-then-owned:
// presence of a key means the user owns that structure; absence means the view
// uses olli's faithful inferred structure (shown in the editor as an editable
// seed). Rendered as that view's olli unit, so the chart's own groupings read in
// visualization language while user-added groupings on other fields read plainly —
// no separate "additional" concept needed.
export interface TextSpec {
  structures: Record<string, TextNode[]>;
}

export interface UmweltSpec {
  data: UmweltDataSource;
  fields: FieldDef[];
  key: FieldName[];
  visual: VisualSpec;
  audio: AudioSpec;
  text: TextSpec;
}

export type ExportableFieldDef = Omit<FieldDef, 'encodings' | 'active'>;

// Auto-generated unit names follow `${prefix}${index}`. When a unit still carries
// the default name for its position (or a modality has a single unit), the name is
// redundant and omitted from the export, then reconstructed on import from the
// unit's index. Keep these the single source of truth for both minting new units
// (UmweltSpecContext) and the export/import round-trip (util/spec).
export const DEFAULT_VISUAL_UNIT_PREFIX = 'vis_unit_';
export const DEFAULT_AUDIO_UNIT_PREFIX = 'audio_unit_';
export const defaultVisualUnitName = (index: number) => `${DEFAULT_VISUAL_UNIT_PREFIX}${index}`;
export const defaultAudioUnitName = (index: number) => `${DEFAULT_AUDIO_UNIT_PREFIX}${index}`;

// The exported unit omits `name` when it can be reconstructed on import (see above).
export type ExportableVisualUnitSpec = Omit<VisualUnitSpec, 'name'> & { name?: string };
export type ExportableAudioUnitSpec = Omit<AudioUnitSpec, 'name'> & { name?: string };

// composition is only meaningful with multiple units, so it's optional here
export interface ExportableVisualSpec {
  units: ExportableVisualUnitSpec[];
  composition?: ViewComposition;
}

export interface ExportableAudioSpec {
  units: ExportableAudioUnitSpec[];
  composition?: ViewComposition;
}

// A modality with exactly one unit exports as the bare unit rather than a
// `{ units: [unit] }` wrapper (composition is meaningless for a lone unit).
// The wrapper form is distinguished on import by its `units` array.
export function isExportableVisualSpec(visual: ExportableVisualSpec | ExportableVisualUnitSpec): visual is ExportableVisualSpec {
  return 'units' in visual;
}

export function isExportableAudioSpec(audio: ExportableAudioSpec | ExportableAudioUnitSpec): audio is ExportableAudioSpec {
  return 'units' in audio;
}

// text is exported only when it carries authored structure
export interface ExportableTextSpec {
  structures: Record<string, TextNode[]>;
}

// key for the text structure of the whole dataset when there is no visualization
export const DATA_STRUCTURE_KEY = '';

export interface ExportableSpec extends Omit<UmweltSpec, 'fields' | 'data' | 'visual' | 'audio' | 'text'> {
  data: ExportableUmweltDataSource;
  fields: ExportableFieldDef[];
  visual: ExportableVisualSpec | ExportableVisualUnitSpec;
  audio: ExportableAudioSpec | ExportableAudioUnitSpec;
  text?: ExportableTextSpec;
}
