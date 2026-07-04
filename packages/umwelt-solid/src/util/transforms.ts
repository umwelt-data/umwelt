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

export const derivedDataset = (data: UmweltDataset, fields: ResolvedFieldDef[], binsByField?: Record<string, [number, number][]>): UmweltDataset => {
  // fields with precomputed bins (aligned to the chart's axis ticks, matching
  // the olli tree) get their bin columns assigned here instead of through the
  // vega bin transform, whose equal-width maxbins binning would disagree
  const prebinned = new Set(fields.filter((f) => f.bin && binsByField?.[f.field]?.length).map((f) => f.field));
  let inputData = data;
  if (prebinned.size) {
    inputData = data.map((row) => {
      const out = { ...row };
      for (const field of prebinned) {
        const [startName, endName] = binnedFieldNames(field);
        const bin = assignBin(row[field], binsByField![field]);
        out[startName] = bin ? bin[0] : null;
        out[endName] = bin ? bin[1] : null;
      }
      return out;
    });
  }
  const transforms = fieldsToTransforms(fields, prebinned);
  const transformedData = applyTransforms(inputData, transforms);
  return transformedData;
};

// bins are inclusive-left; the last bin is also inclusive-right, mirroring
// olli's bin predicates
const assignBin = (raw: unknown, bins: [number, number][]): [number, number] | undefined => {
  if (raw == null) return undefined;
  const value = Number(raw);
  if (isNaN(value)) return undefined;
  for (let i = 0; i < bins.length; i++) {
    const [start, end] = bins[i];
    if (value >= start && (value < end || (i === bins.length - 1 && value <= end))) {
      return bins[i];
    }
  }
  return undefined;
};

export const fieldsToTransforms = (fields: ResolvedFieldDef[], prebinnedFields?: Set<string>): UmweltTransform[] => {
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
      if (!timeUnit && !bin) {
        // untransformed fields group by their raw values; without this,
        // an aggregate elsewhere in the unit collapses them out of the data
        groupbyFields.add(fieldName);
      }
    }
  }

  // Second pass: create transforms
  for (const field of fields) {
    const { field: fieldName, timeUnit, bin, aggregate } = field;

    if (bin && !prebinnedFields?.has(fieldName)) {
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
