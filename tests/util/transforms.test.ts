import { test, expect } from 'vitest';
import { getTransformedData } from '../../src/util/datasets';
import { aggregatedFieldName, applyTransforms, binnedFieldNames, fieldsToTransforms, timeUnitFieldName } from '../../src/util/transforms';
import { FieldDef, UmweltDataset } from '../../src/types';
import { UmweltTransform } from '../../src/types';
import { resolveFieldDef } from '../../src/util/spec';

test('transforms match vega-lite', async () => {
  // Create dataset with temporal and numerical data suitable for all transforms
  const dataset = [
    { date: new Date('2023-01-15T08:30:45'), sales: 125, price: 54.99 },
    { date: new Date('2023-01-15T14:20:30'), sales: 89, price: 49.99 },
    { date: new Date('2023-02-01T09:15:00'), sales: 256, price: 59.99 },
    { date: new Date('2023-03-15T11:45:30'), sales: 178, price: 44.99 },
    { date: new Date('2023-06-30T16:20:15'), sales: 312, price: 39.99 },
    { date: new Date('2023-06-30T18:45:00'), sales: 167, price: 39.99 },
    { date: new Date('2024-01-01T00:00:00'), sales: 245, price: 64.99 },
  ];

  // Define transforms to test all three types
  const transforms: UmweltTransform[] = [
    {
      // TimeUnit transform: group by month
      timeUnit: 'month',
      field: 'date',
      as: timeUnitFieldName('date', 'month'),
    },
    {
      // Bin transform: bin prices into ranges
      bin: true,
      field: 'price',
      as: binnedFieldNames('price'),
    },
    {
      // Aggregate transform: sum sales by month and price bin
      aggregate: [
        {
          op: 'sum',
          field: 'sales',
          as: aggregatedFieldName('sales', 'sum'),
        },
      ],
      groupby: [timeUnitFieldName('date', 'month'), ...binnedFieldNames('price')],
    },
  ];

  const transformedData = applyTransforms(dataset, transforms);

  // Define corresponding field definitions with inline transforms
  const fieldDefs: FieldDef[] = [
    {
      active: true,
      name: 'date',
      type: 'temporal',
      timeUnit: 'month',
      encodings: [],
    },
    {
      active: true,
      name: 'price',
      type: 'quantitative',
      bin: true,
      encodings: [],
    },
    {
      active: true,
      name: 'sales',
      type: 'quantitative',
      aggregate: 'sum',
      encodings: [],
    },
  ];

  const expectedTransforms = fieldsToTransforms(fieldDefs.map((f) => resolveFieldDef(f)));

  expect(expectedTransforms).toEqual(transforms);

  const expectedData = (await getTransformedData(dataset, expectedTransforms)).map((d) => {
    return Object.fromEntries(Object.entries(d)); // removes Symbol(vega_id)
  });

  expect(transformedData).toEqual(expectedData);
});

test('handles empty dataset', () => {
  const dataset: UmweltDataset = [];
  const transforms: UmweltTransform[] = [
    {
      timeUnit: 'month',
      field: 'date',
      as: timeUnitFieldName('date', 'month'),
    },
    {
      aggregate: [
        {
          op: 'sum',
          field: 'value',
          as: aggregatedFieldName('value', 'sum'),
        },
      ],
      groupby: [timeUnitFieldName('date', 'month')],
    },
  ];

  const result = applyTransforms(dataset, transforms);
  expect(result).toHaveLength(0);
});

test('handles sparse temporal data with nulls', async () => {
  const dataset = [
    { date: new Date('2023-01-15'), value: 100, category: 'A' },
    { date: null, value: 200, category: 'B' },
    { date: new Date('2023-03-15'), value: null, category: 'A' },
    { date: new Date('2023-06-30'), value: 400, category: null },
  ];

  const fieldDefs: FieldDef[] = [
    {
      active: true,
      name: 'date',
      type: 'temporal',
      timeUnit: 'quarter',
      encodings: [],
    },
    {
      active: true,
      name: 'value',
      type: 'quantitative',
      aggregate: 'mean',
      encodings: [],
    },
  ];

  const transforms = fieldsToTransforms(fieldDefs.map((f) => resolveFieldDef(f)));

  const transformedData = applyTransforms(dataset, transforms);
  const expectedData = (await getTransformedData(dataset, transforms)).map((d) => {
    return Object.fromEntries(Object.entries(d));
  });

  expect(transformedData).toEqual(expectedData);
});

test('handles high-cardinality numeric data binning', async () => {
  const dataset = Array.from({ length: 100 }, (_, i) => ({
    metric: Math.random() * 1000,
    count: Math.floor(Math.random() * 50),
    group: String.fromCharCode(65 + (i % 3)),
  }));

  const fieldDefs: FieldDef[] = [
    {
      active: true,
      name: 'metric',
      type: 'quantitative',
      bin: true,
      encodings: [],
    },
    {
      active: true,
      name: 'count',
      type: 'quantitative',
      aggregate: 'sum',
      encodings: [],
    },
  ];

  const transforms = fieldsToTransforms(fieldDefs.map((f) => resolveFieldDef(f)));
  const transformedData = applyTransforms(dataset, transforms);
  const expectedData = (await getTransformedData(dataset, transforms)).map((d) => {
    return Object.fromEntries(Object.entries(d));
  });

  expect(transformedData).toEqual(expectedData);
});

test('handles multiple time units and aggregations', async () => {
  const dataset = [
    { timestamp: new Date('2023-01-01T08:30:00'), sales: 100, profit: 20 },
    { timestamp: new Date('2023-01-01T12:45:00'), sales: 150, profit: 35 },
    { timestamp: new Date('2023-01-02T09:15:00'), sales: 200, profit: 40 },
    { timestamp: new Date('2023-02-01T14:20:00'), sales: 300, profit: 60 },
  ];

  const fieldDefs: FieldDef[] = [
    {
      active: true,
      name: 'timestamp',
      type: 'temporal',
      timeUnit: 'hours',
      encodings: [],
    },
    {
      active: true,
      name: 'sales',
      type: 'quantitative',
      aggregate: 'mean',
      encodings: [],
    },
    {
      active: true,
      name: 'profit',
      type: 'quantitative',
      aggregate: 'min',
      encodings: [],
    },
  ];

  const transforms = fieldsToTransforms(fieldDefs.map((f) => resolveFieldDef(f)));
  const transformedData = applyTransforms(dataset, transforms);
  const expectedData = (await getTransformedData(dataset, transforms)).map((d) => {
    return Object.fromEntries(Object.entries(d));
  });

  expect(transformedData).toEqual(expectedData);
});
