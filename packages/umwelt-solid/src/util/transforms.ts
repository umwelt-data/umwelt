import { AggregateTransform, BinTransform, TimeUnitTransform } from 'vega-lite/build/src/transform';
import { ResolvedFieldDef, isUmweltAggregateOp, UmweltDataset, UmweltTransform, VlSpec } from '../types';
import { compile } from 'vega-lite';
import { evaluateVegaData, extractOutputDatasets, type VegaDataEntry } from '@umwelt-data/umwelt-utils/vega';
import { NonArgAggregateOp } from 'vega-lite/build/src/aggregate';
import { TimeUnit } from 'vega-lite/build/src/timeunit';

export const aggregatedFieldName = (field: string, op: NonArgAggregateOp): string => `${op}_${field}`;
export const binnedFieldNames = (field: string): [string, string] => [`${field}_bin_start`, `${field}_bin_end`];
export const timeUnitFieldName = (field: string, timeUnit: TimeUnit): string => `${timeUnit}_${field}`;

export const derivedFieldName = (field: ResolvedFieldDef): string => {
  const transforms = fieldsToTransforms([field]);
  let name = field.field;
  for (const transform of transforms) {
    if ('aggregate' in transform) {
      for (const agg of transform.aggregate) {
        if (isUmweltAggregateOp(agg.op)) {
          name = aggregatedFieldName(name, agg.op);
        }
      }
    } else if ('bin' in transform && !field.aggregate) {
      name = binnedFieldNames(name)[0];
    } else if ('timeUnit' in transform && !field.aggregate) {
      name = timeUnitFieldName(name, transform.timeUnit as TimeUnit);
    }
  }
  return name;
};

export const derivedFieldNameBinStartEnd = (field: ResolvedFieldDef): [string, string] => {
  const transforms = fieldsToTransforms([field]);
  let name: string | [string, string] = field.field;
  for (const transform of transforms) {
    if ('aggregate' in transform) {
      for (const agg of transform.aggregate) {
        if (isUmweltAggregateOp(agg.op)) {
          if (typeof name === 'string') {
            name = aggregatedFieldName(name, agg.op);
          } else {
            name = [aggregatedFieldName(name[0], agg.op), aggregatedFieldName(name[1], agg.op)];
          }
        }
      }
    } else if ('bin' in transform && !field.aggregate) {
      if (typeof name === 'string') {
        name = binnedFieldNames(name);
      } else {
        name = [binnedFieldNames(name[0])[0], binnedFieldNames(name[1])[1]];
      }
    } else if ('timeUnit' in transform && !field.aggregate) {
      if (typeof name === 'string') {
        name = timeUnitFieldName(name, transform.timeUnit as TimeUnit);
      } else {
        name = [timeUnitFieldName(name[0], transform.timeUnit as TimeUnit), timeUnitFieldName(name[1], transform.timeUnit as TimeUnit)];
      }
    }
  }
  if (typeof name === 'string') {
    throw new Error('Expected derived field name to be a tuple');
  }
  return name;
};

export const derivedDataset = (data: UmweltDataset, fields: ResolvedFieldDef[]): UmweltDataset => {
  const transforms = fieldsToTransforms(fields);
  const transformedData = applyTransforms(data, transforms);
  return transformedData;
};

export const fieldsToTransforms = (fields: ResolvedFieldDef[]): UmweltTransform[] => {
  const timeUnitTransforms: TimeUnitTransform[] = [];
  const binTransforms: BinTransform[] = [];
  const aggregateTransforms: AggregateTransform[] = [];
  const groupbyFields: Set<string> = new Set();

  // First pass: collect non-aggregated groupby fields
  for (const field of fields) {
    const { field: fieldName, timeUnit, bin, aggregate } = field;

    if (!aggregate) {
      if (timeUnit) {
        groupbyFields.add(timeUnitFieldName(fieldName, timeUnit));
      }
      if (bin) {
        binnedFieldNames(fieldName).forEach((f) => groupbyFields.add(f));
      }
    }
  }

  // Second pass: create transforms
  for (const field of fields) {
    const { field: fieldName, timeUnit, bin, aggregate } = field;

    if (bin) {
      const binOutputFields = binnedFieldNames(fieldName);
      binTransforms.push({
        bin: true,
        field: fieldName,
        as: binOutputFields,
      });
    }

    if (timeUnit) {
      const outputField = bin ? binnedFieldNames(fieldName)[0] : timeUnitFieldName(fieldName, timeUnit);
      timeUnitTransforms.push({
        timeUnit,
        field: fieldName,
        as: outputField,
      });
    }

    if (aggregate) {
      const targetField = bin ? binnedFieldNames(fieldName)[0] : fieldName;
      const existingAggregate = aggregateTransforms.find((t) => t.groupby?.length === groupbyFields.size && t.groupby?.every((g) => groupbyFields.has(g)));

      if (existingAggregate) {
        existingAggregate.aggregate.push({
          op: aggregate,
          field: targetField,
          as: aggregatedFieldName(fieldName, aggregate),
        });
      } else {
        aggregateTransforms.push({
          aggregate: [
            {
              op: aggregate,
              field: targetField,
              as: aggregatedFieldName(fieldName, aggregate),
            },
          ],
          groupby: Array.from(groupbyFields),
        });
      }
    }
  }

  return [...binTransforms, ...timeUnitTransforms, ...aggregateTransforms];
};

/**
 * Apply vega-lite transforms to a dataset by compiling a minimal spec and
 * running its data pipeline through the shared vega data evaluator.
 */
export function applyTransforms(dataset: UmweltDataset, transforms: UmweltTransform[]): UmweltDataset {
  const vlSpec: VlSpec = {
    data: { values: dataset },
    transform: transforms,
    mark: 'point',
  };
  const vgSpec = compile(vlSpec as any).spec;
  const dataEntries = (vgSpec.data ?? []) as VegaDataEntry[];
  const store = evaluateVegaData(dataEntries);
  const datasets = extractOutputDatasets(dataEntries, store);
  // the last output dataset is the furthest through the transform pipeline
  return (datasets[datasets.length - 1] ?? []) as UmweltDataset;
}
