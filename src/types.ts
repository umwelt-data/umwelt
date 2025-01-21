import { Type } from 'vega-lite/src/type';
import { Mark } from 'vega-lite/src/mark';
import { NonArgAggregateOp } from 'vega-lite/src/aggregate';
import { Spec, TimeUnit } from 'vega';
import { TopLevelSpec } from 'vega-lite/src/spec';
import { Sort } from 'vega-lite/src/sort';
import { LogicalComposition } from 'vega-lite/src/logical';
import { FieldPredicate } from 'vega-lite/src/predicate';
import { AggregateTransform, BinTransform, TimeUnitTransform } from 'vega-lite/src/transform';

export type VlSpec = TopLevelSpec;
export type VgSpec = Spec;

export type UmweltValue = string | number | Date | null;
export type UmweltDatum = { [field: string]: UmweltValue };
export type UmweltDataset = UmweltDatum[];

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

export type MeasureType = Exclude<Type, 'geojson'>;

export interface UmweltDataSource {
  name?: string;
  values: UmweltDataset;
}

export type UmweltPredicate = LogicalComposition<FieldPredicate>;

export const visualPropNames = ['x', 'y', 'color', 'shape', 'size', 'opacity', 'order', 'facet'] as const;
export const audioPropNames = ['pitch', 'duration', 'volume'] as const;

export type VisualPropName = (typeof visualPropNames)[number];
export type AudioPropName = (typeof audioPropNames)[number];
export type EncodingPropName = VisualPropName | AudioPropName;

export const markTypes = ['point', 'line', 'bar', 'area'];
export type MarkType = (typeof markTypes)[number];

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
  timeUnit?: TimeUnit;
  aggregate?: UmweltAggregateOp;
  bin?: boolean;
  sort?: Sort<any>;
}

export interface VisualEncodingFieldDef {
  field: FieldName;
  //
  scale?: ScaleDomain & ScaleRange;
  timeUnit?: TimeUnit | typeof NONE;
  aggregate?: UmweltAggregateOp | typeof NONE;
  bin?: boolean;
  sort?: Sort<any>;
}

export interface AudioEncodingFieldDef {
  field: FieldName;
  //
  scale?: ScaleDomain & ScaleRange;
  timeUnit?: TimeUnit | typeof NONE;
  aggregate?: UmweltAggregateOp | typeof NONE;
  sort?: Sort<any>;
  bin?: undefined;
}

export type EncodingFieldDef = VisualEncodingFieldDef | AudioEncodingFieldDef | AudioTraversalFieldDef;

export type ResolvedFieldDef = Omit<FieldDef, 'active' | 'name' | 'encodings'> & EncodingFieldDef;

export interface AudioTraversalFieldDef {
  field: FieldName;
  //
  scale?: ScaleDomain & ScaleRange;
  timeUnit?: TimeUnit | typeof NONE;
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

export interface UmweltSpec {
  data: UmweltDataSource;
  fields: FieldDef[];
  key: FieldName[];
  visual: VisualSpec;
  audio: AudioSpec;
  // text: OlliNode | OlliNode[] | boolean;
}

export interface ExportableSpec extends Omit<UmweltSpec, 'data'> {
  data: { name?: string };
}
