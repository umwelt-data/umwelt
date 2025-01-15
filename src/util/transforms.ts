import { UmweltDataset, UmweltTransform } from '../types';

function applyVegaTransforms(dataset: UmweltDataset, transforms: UmweltTransform[]) {
  // Make a copy of the dataset to avoid mutating the original
  let transformedData = [...dataset];

  for (const transform of transforms) {
    if (transform.aggregate) {
      transformedData = handleAggregate(transformedData, transform);
    } else if (transform.bin) {
      transformedData = handleBin(transformedData, transform);
    } else if (transform.timeUnit) {
      transformedData = handleTimeUnit(transformedData, transform);
    }
  }

  return transformedData;
}

function handleAggregate(data, transform) {
  const { aggregate, groupby = [], fields, as } = transform;

  // Create groups based on groupby fields
  const groups = new Map();

  for (const row of data) {
    const groupKey = groupby.map((field) => row[field]).join('|');
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(row);
  }

  // Apply aggregations for each group
  return Array.from(groups.entries()).map(([groupKey, groupRows]) => {
    const result = {};

    // Add groupby fields to result
    groupby.forEach((field, i) => {
      result[field] = groupRows[0][field];
    });

    // Apply each aggregation
    aggregate.forEach((op, i) => {
      const field = fields[i];
      const outputField = as[i];
      const values = groupRows.map((d) => d[field]);

      result[outputField] = aggregateOp(op, values);
    });

    return result;
  });
}

function handleBin(data, transform) {
  const { field, as = [field + '_bin_start', field + '_bin_end'], ...binOptions } = transform.bin;

  return data.map((row) => {
    const value = row[field];
    const binned = bin(binOptions)(value);

    return {
      ...row,
      [as[0]]: binned.start,
      [as[1]]: binned.end,
    };
  });
}

function handleTimeUnit(data, transform) {
  const { field, timeUnit: unit, as = field + '_' + unit } = transform;

  return data.map((row) => {
    const value = row[field];
    const transformed = timeUnit(unit)(new Date(value));

    return {
      ...row,
      [as]: transformed,
    };
  });
}

export default applyVegaTransforms;
