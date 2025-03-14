import { AggregateTransform, BinTransform, TimeUnitTransform } from 'vega-lite/src/transform';
import { ResolvedFieldDef, isUmweltAggregateOp, isUmweltTimeUnit, UmweltDataset, UmweltDatum, UmweltTransform, UmweltValue } from '../types';
//@ts-ignore
import { bin } from 'vega-statistics';
import cloneDeep from 'lodash.clonedeep';
import { NonArgAggregateOp } from 'vega-lite/src/aggregate';
import { TimeUnit } from 'vega-lite/src/timeunit';

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

export function applyTransforms(dataset: UmweltDataset, transforms: UmweltTransform[]): UmweltDataset {
  let transformedData = cloneDeep(dataset);

  for (const transform of transforms) {
    if ('aggregate' in transform) {
      transformedData = handleAggregate(transformedData, transform);
    } else if ('bin' in transform) {
      transformedData = handleBin(transformedData, transform);
    } else if ('timeUnit' in transform) {
      transformedData = handleTimeUnit(transformedData, transform);
    }
  }

  return transformedData;
}

function computeAggregation(values: UmweltValue[], op: NonArgAggregateOp): number | undefined {
  // Filter out non-numeric values and convert to numbers
  const numbers = values
    .filter((n) => n !== null && n !== undefined)
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((n) => !isNaN(n));

  if (numbers.length === 0) return undefined;

  // TODO this is more operators than we currently expose via UmweltAggregateOp in types.ts
  switch (op) {
    case 'count':
      return values.length;

    case 'valid':
      return numbers.length;

    case 'missing':
      return values.length - numbers.length;

    case 'distinct':
      return new Set(numbers).size;

    case 'sum':
      return numbers.reduce((acc, val) => acc + val, 0);

    case 'mean':
    case 'average':
      return numbers.reduce((acc, val) => acc + val, 0) / numbers.length;

    case 'variance': {
      const mean = numbers.reduce((acc, val) => acc + val, 0) / numbers.length;
      const squareDiffs = numbers.map((val) => Math.pow(val - mean, 2));
      return squareDiffs.reduce((acc, val) => acc + val, 0) / numbers.length;
    }

    case 'stdev': {
      const mean = numbers.reduce((acc, val) => acc + val, 0) / numbers.length;
      const squareDiffs = numbers.map((val) => Math.pow(val - mean, 2));
      const variance = squareDiffs.reduce((acc, val) => acc + val, 0) / numbers.length;
      return Math.sqrt(variance);
    }

    case 'min':
      return Math.min(...numbers);

    case 'max':
      return Math.max(...numbers);

    case 'median': {
      const sorted = [...numbers].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    case 'q1': {
      const sorted = [...numbers].sort((a, b) => a - b);
      const quarter = Math.floor(sorted.length / 4);
      return sorted[quarter];
    }

    case 'q3': {
      const sorted = [...numbers].sort((a, b) => a - b);
      const quarter = Math.floor((3 * sorted.length) / 4);
      return sorted[quarter];
    }

    default:
      throw new Error(`Unsupported aggregation operation: ${op}`);
  }
}

function handleAggregate(data: UmweltDataset, transform: AggregateTransform): UmweltDataset {
  const { aggregate, groupby = [] } = transform;

  // Create groups based on groupby fields
  const groups = new Map<string, UmweltDatum[]>();

  for (const row of data) {
    const groupKey = groupby.map((field) => String(row[field])).join('|');
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(row);
  }

  // Apply aggregations for each group
  return Array.from(groups.entries()).map(([groupKey, groupRows]) => {
    const result: UmweltDatum = {};

    // Add groupby fields to result
    groupby.forEach((field) => {
      result[field] = groupRows[0][field];
    });

    // Apply each aggregation
    aggregate.forEach((aggDef) => {
      const { op, field, as } = aggDef;
      // For count operation, field is optional
      const values =
        op === 'count' && !field
          ? groupRows.map(() => 1) // Use 1 for each row when counting
          : field
          ? groupRows.map((d) => d[field])
          : [];

      if (isUmweltAggregateOp(op)) {
        const v = computeAggregation(values, op);
        if (v) {
          result[as] = v;
        }
      }
    });

    return result;
  });
}

export function handleBin(data: UmweltDataset, transform: BinTransform): UmweltDataset {
  if (!data.length) return [];

  // Extract values to bin
  const values = data
    .map((d) => d[transform.field])
    .map((v) => (v instanceof Date ? v.getTime() : v))
    .filter((v): v is number => typeof v === 'number');

  // Handle empty or invalid data
  if (!values.length) return data;

  // Set up bin parameters
  const binParams = transform.bin === true ? {} : transform.bin;
  const extent = (binParams.extent as [number, number]) || [Math.min(...values), Math.max(...values)];

  // Configure bin options
  const binOptions = {
    extent,
    maxbins: binParams.maxbins ?? 10,
    base: binParams.base,
    step: binParams.step,
    steps: binParams.steps,
    minstep: binParams.minstep,
    divide: binParams.divide,
    nice: binParams.nice ?? true,
  };

  // Generate bins using vega-statistics
  const bins = bin(binOptions);
  if (!bins?.step) return data;

  // Determine output field names
  let startField: string;
  let endField: string;
  if (Array.isArray(transform.as)) {
    [startField, endField] = transform.as;
  } else {
    startField = transform.as;
    endField = `${transform.as}_end`;
  }

  // Apply binning to the dataset
  return data.map((datum) => {
    const value = datum[transform.field] as number;
    if (value == null) {
      return {
        ...datum,
        [startField]: null,
        [endField]: null,
      };
    }

    // Find the appropriate bin
    const binStart = (index: number) => bins.start + index * bins.step;
    const binEnd = (index: number) => bins.start + (index + 1) * bins.step;
    const maxIndex = (bins.stop - bins.start) / bins.step - 1;
    let binIndex = 0;

    while (!(value >= binStart(binIndex) && value < binEnd(binIndex)) && binIndex < maxIndex) {
      binIndex++;
    }

    return {
      ...datum,
      [startField]: binStart(binIndex),
      [endField]: binEnd(binIndex),
    };
  });
}

type DateGetter = keyof Pick<Date, 'getFullYear' | 'getMonth' | 'getDate' | 'getHours' | 'getMinutes' | 'getSeconds' | 'getMilliseconds' | 'getDay' | 'getUTCFullYear' | 'getUTCMonth' | 'getUTCDate' | 'getUTCHours' | 'getUTCMinutes' | 'getUTCSeconds' | 'getUTCMilliseconds' | 'getUTCDay'>;

type DateSetter = keyof Pick<Date, 'setFullYear' | 'setMonth' | 'setDate' | 'setHours' | 'setMinutes' | 'setSeconds' | 'setMilliseconds' | 'setUTCFullYear' | 'setUTCMonth' | 'setUTCDate' | 'setUTCHours' | 'setUTCMinutes' | 'setUTCSeconds' | 'setUTCMilliseconds'>;

interface TimeGetters {
  year: DateGetter;
  month: DateGetter;
  date: DateGetter;
  hours: DateGetter;
  minutes: DateGetter;
  seconds: DateGetter;
  milliseconds: DateGetter;
  day: DateGetter;
}

interface TimeSetters {
  year: DateSetter;
  month: DateSetter;
  date: DateSetter;
  hours: DateSetter;
  minutes: DateSetter;
  seconds: DateSetter;
  milliseconds: DateSetter;
}

function handleTimeUnit(dataset: UmweltDataset, transform: TimeUnitTransform): UmweltDataset {
  const { field, as, timeUnit } = transform;
  const asStart = as;
  const asEnd = `${as}_end`;

  return dataset.map((datum) => {
    const value = datum[field];
    if (!(value instanceof Date)) {
      return { ...datum, [asStart]: null, [asEnd]: null };
    }

    const unit = typeof timeUnit === 'string' ? timeUnit : timeUnit.unit;
    const utc = typeof timeUnit === 'object' ? Boolean(timeUnit.utc) : timeUnit.startsWith('utc');

    const result = { ...datum };
    if (isUmweltTimeUnit(unit)) {
      const [start, end] = getTimeUnitInterval(value, unit, utc);
      result[asStart] = start;
      result[asEnd] = end;
    }
    return result;
  });
}

function formatTimeUnit(date: Date, unit?: TimeUnit, utc: boolean = false): Date {
  // Default year for time units that don't include a year
  // it's 2012 because it's a leap year and we can use it for all time units
  const VEGA_DEFAULT_YEAR = 2012;

  const getters: TimeGetters = {
    year: utc ? 'getUTCFullYear' : 'getFullYear',
    month: utc ? 'getUTCMonth' : 'getMonth',
    date: utc ? 'getUTCDate' : 'getDate',
    hours: utc ? 'getUTCHours' : 'getHours',
    minutes: utc ? 'getUTCMinutes' : 'getMinutes',
    seconds: utc ? 'getUTCSeconds' : 'getSeconds',
    milliseconds: utc ? 'getUTCMilliseconds' : 'getMilliseconds',
    day: utc ? 'getUTCDay' : 'getDay',
  };

  const setters: TimeSetters = {
    year: utc ? 'setUTCFullYear' : 'setFullYear',
    month: utc ? 'setUTCMonth' : 'setMonth',
    date: utc ? 'setUTCDate' : 'setDate',
    hours: utc ? 'setUTCHours' : 'setHours',
    minutes: utc ? 'setUTCMinutes' : 'setMinutes',
    seconds: utc ? 'setUTCSeconds' : 'setSeconds',
    milliseconds: utc ? 'setUTCMilliseconds' : 'setMilliseconds',
  };

  if (!unit) return new Date(date);

  const result = new Date(0);
  result[setters.year](VEGA_DEFAULT_YEAR);
  result[setters.month](0);
  result[setters.date](1);
  result[setters.hours](0);
  result[setters.minutes](0);
  result[setters.seconds](0);
  result[setters.milliseconds](0);

  const multiUnit = unit.replace('utc', '').toLowerCase();

  if (multiUnit.includes('year')) {
    result[setters.year](date[getters.year]());
  }
  if (multiUnit.includes('quarter')) {
    // note these are mutually exclusive because they both set the month
    const month = date[getters.month]();
    const quarterMonth = Math.floor(month / 3) * 3;
    result[setters.month](quarterMonth);
  } else if (multiUnit.includes('month')) {
    result[setters.month](date[getters.month]());
  }
  if (multiUnit.includes('date')) {
    result[setters.date](date[getters.date]());
  }
  if (multiUnit.includes('day')) {
    // Get the current day of week
    const dayOfWeek = date[getters.day]();
    // Move to first valid date with same day of week
    while (result[getters.day]() !== dayOfWeek) {
      result[setters.date](result[getters.date]() + 1);
    }
  }
  if (multiUnit.includes('hours')) {
    result[setters.hours](date[getters.hours]());
  }
  if (multiUnit.includes('minutes')) {
    result[setters.minutes](date[getters.minutes]());
  }
  if (multiUnit.includes('seconds')) {
    result[setters.seconds](date[getters.seconds]());
  }
  if (multiUnit.includes('milliseconds')) {
    result[setters.milliseconds](date[getters.milliseconds]());
  }

  return result;
}

function getTimeUnitInterval(date: Date, unit: TimeUnit, utc: boolean): [Date, Date] {
  // Get start of interval
  const start = formatTimeUnit(date, unit, utc);

  // Create end date by getting next interval
  const end = new Date(start);
  const multiUnit = unit.replace('utc', '').toLowerCase();

  // Find smallest unit and increment only that
  if (multiUnit.includes('milliseconds')) {
    end.setMilliseconds(end.getMilliseconds() + 1);
  } else if (multiUnit.includes('seconds')) {
    end.setSeconds(end.getSeconds() + 1);
  } else if (multiUnit.includes('minutes')) {
    end.setMinutes(end.getMinutes() + 1);
  } else if (multiUnit.includes('hours')) {
    end.setHours(end.getHours() + 1);
  } else if (multiUnit.includes('date') || multiUnit.includes('day')) {
    end.setDate(end.getDate() + 1);
  } else if (multiUnit.includes('month') && !multiUnit.includes('quarter')) {
    end.setMonth(end.getMonth() + 1);
  } else if (multiUnit.includes('quarter')) {
    end.setMonth(end.getMonth() + 3);
  } else if (multiUnit.includes('year')) {
    end.setFullYear(end.getFullYear() + 1);
  }

  return [start, end];
}
