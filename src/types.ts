import { Type } from 'vega-lite/src/type';
import { UrlData, InlineData } from 'vega-lite/src/data';
import { Mark } from 'vega-lite/src/mark';
import { NonArgAggregateOp } from 'vega-lite/src/aggregate';
import { Spec, TimeUnit } from 'vega';
import { TopLevelSpec } from 'vega-lite/src/spec';
import { Sort } from 'vega-lite/src/sort';
import { LogicalComposition } from 'vega-lite/src/logical';
import { FieldPredicate } from 'vega-lite/src/predicate';

export type VlSpec = TopLevelSpec;
export type VgSpec = Spec;

export type UmweltValue = string | number | Date;
export type UmweltDatum = { [field: string]: UmweltValue };
export type UmweltDataset = UmweltDatum[];

type ScaleDomain = {
  domain?: UmweltValue[];
  zero?: boolean;
  nice?: boolean | number;
}; //  | "type"
type ScaleRange = {
  range?: number[] | string[];
}; //  | "reverse"

export type MeasureType = Exclude<Type, 'geojson'>;
export type UmweltDataSource = UrlData | InlineData;

export type UmweltPredicate = LogicalComposition<FieldPredicate>;

export const visualPropNames = ['x', 'y', 'color', 'shape', 'size', 'opacity', 'order', 'facet'];
export const audioPropNames = ['pitch', 'duration', 'volume'];

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

export type AudioAggregateOp = 'count' | 'mean' | 'median' | 'min' | 'max' | 'sum';

export const NONE = 'NONE';

type FieldName = string;

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
  aggregate?: NonArgAggregateOp;
  bin?: boolean;
  sort?: Sort<any>;
}

export interface VisualEncodingFieldDef {
  field: FieldName;
  //
  scale?: ScaleDomain & ScaleRange;
  timeUnit?: TimeUnit;
  aggregate?: NonArgAggregateOp | typeof NONE;
  bin?: boolean;
  sort?: Sort<any>;
}

export interface AudioEncodingFieldDef {
  field: FieldName;
  //
  scale?: ScaleDomain & ScaleRange;
  // timeUnit?: string;
  aggregate?: NonArgAggregateOp | typeof NONE;
  sort?: Sort<any>;
  // bin: undefined;
}

export type EncodingFieldDef = VisualEncodingFieldDef | AudioEncodingFieldDef;

export interface AudioTraversalFieldDef {
  field: FieldName;
  //
  scale?: ScaleDomain & ScaleRange;
  timeUnit?: TimeUnit;
  bin?: boolean;
  // aggregate: undefined;
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

export type ViewComposition = 'layer' | 'concat';

export interface VisualSpec {
  units: VisualUnitSpec[];
  composition: ViewComposition;
}

export interface AudioSpec {
  units: AudioUnitSpec[];
  composition: ViewComposition;
}

export interface UmweltSpec {
  data: UmweltDataset;
  fields: FieldDef[];
  key: FieldName[];
  visual: VisualSpec;
  audio: AudioSpec;
  // text: OlliNode | OlliNode[] | boolean;
}
