import { test, expect } from 'vitest';
import { audioUnitFieldBins, chartAxisTicks } from '../../src/util/ticks';
import { derivedDataset } from '../../src/util/transforms';
import { UmweltSpec } from '../../src/types';

const carsLikeSpec = (mark: 'point' | 'bar' = 'point'): UmweltSpec => ({
  data: { name: 'cars.json' },
  key: [],
  fields: [
    { name: 'Horsepower', type: 'quantitative', active: true, encodings: [{ unit: 'vis_unit_0', property: 'y' }] },
    { name: 'Miles_per_Gallon', type: 'quantitative', active: true, encodings: [{ unit: 'vis_unit_0', property: 'x' }] },
  ],
  visual: {
    units: [
      {
        name: 'vis_unit_0',
        mark,
        encoding: {
          x: { field: 'Miles_per_Gallon' },
          y: { field: 'Horsepower' },
        },
      },
    ],
    composition: 'layer',
  },
  audio: { units: [], composition: 'concat' },
  text: { structures: {} },
});

const data = [
  { Horsepower: 46, Miles_per_Gallon: 26 },
  { Horsepower: 88, Miles_per_Gallon: 27 },
  { Horsepower: 130, Miles_per_Gallon: 18 },
  { Horsepower: 165, Miles_per_Gallon: 15 },
  { Horsepower: 230, Miles_per_Gallon: 9 },
];

test('chartAxisTicks disables zero for quantitative point-mark axes', () => {
  const narrow = [{ Horsepower: 130 }, { Horsepower: 190 }];
  const pointTicks = chartAxisTicks(carsLikeSpec('point'), narrow, 'Horsepower') as number[];
  const barTicks = chartAxisTicks(carsLikeSpec('bar'), narrow, 'Horsepower') as number[];
  expect(pointTicks[0]).toBeGreaterThan(0);
  expect(barTicks[0]).toBe(0);
});

test('chartAxisTicks returns undefined for fields without an x/y encoding', () => {
  const spec = carsLikeSpec();
  spec.fields.push({ name: 'Origin', type: 'nominal', active: true, encodings: [] });
  expect(chartAxisTicks(spec, data, 'Origin')).toBeUndefined();
});

test('chartAxisTicks for a timeUnit axis ticks the bucketed dates, not the raw extent', () => {
  const spec: UmweltSpec = {
    data: { name: 'weather.csv' },
    key: ['date'],
    fields: [
      { name: 'date', type: 'temporal', timeUnit: 'month', active: true, encodings: [{ unit: 'vis_unit_0', property: 'x' }] },
      { name: 'temp', type: 'quantitative', active: true, encodings: [{ unit: 'vis_unit_0', property: 'y' }] },
    ],
    visual: {
      units: [
        {
          name: 'vis_unit_0',
          mark: 'line',
          encoding: {
            x: { field: 'date', timeUnit: 'month' },
            y: { field: 'temp', aggregate: 'mean' },
          },
        },
      ],
      composition: 'layer',
    },
    audio: { units: [], composition: 'concat' },
    text: { structures: {} },
  };
  const rows: { date: Date; temp: number }[] = [];
  for (let y = 2012; y <= 2015; y++) {
    for (let m = 0; m < 12; m++) {
      rows.push({ date: new Date(y, m, 15), temp: m });
    }
  }

  const ticks = chartAxisTicks(spec, rows, 'date') as Date[];
  expect(ticks.length).toBeGreaterThan(1);

  // the ticks must live in the same month-bucketed date space as the derived
  // traversal values (one reference year), not span the raw 2012–2015 extent —
  // otherwise announcements comparing derived values against ticks never fire
  const derived = derivedDataset(rows, [{ field: 'date', type: 'temporal', timeUnit: 'month' }] as any);
  const bucketed = derived.map((d) => (d.month_date as Date).getTime());
  const lo = Math.min(...bucketed);
  const hi = Math.max(...bucketed);
  const monthMs = 32 * 24 * 3600 * 1000; // nice() may extend one step past the domain
  for (const t of ticks) {
    expect(t.getTime()).toBeGreaterThanOrEqual(lo - monthMs);
    expect(t.getTime()).toBeLessThanOrEqual(hi + monthMs);
  }
});

test('audioUnitFieldBins keeps one bin for a constant field so the traversal stays playable', () => {
  const spec = carsLikeSpec();
  const constant = [{ Horsepower: 100 }, { Horsepower: 100 }];
  const bins = audioUnitFieldBins(spec, constant, constant, [{ field: 'Horsepower', type: 'quantitative', bin: true }] as any);
  expect(bins.Horsepower).toEqual([[100, 100]]);
});

test('derivedDataset groups aggregates by precomputed tick-aligned bins', () => {
  const spec = carsLikeSpec();
  const resolvedFields = [
    { field: 'Horsepower', type: 'quantitative', bin: true },
    { field: 'Miles_per_Gallon', type: 'quantitative', aggregate: 'mean' },
  ] as any;
  const bins = audioUnitFieldBins(spec, data, data, resolvedFields);
  // point mark, zero disabled: d3 nice(5) over [46, 230] still lands on [0..250] step 50,
  // and getBins clips the outer intervals to the data domain — matching the olli tree
  expect(bins.Horsepower).toEqual([
    [46, 50],
    [50, 100],
    [100, 150],
    [150, 200],
    [200, 230],
  ]);

  const derived = derivedDataset(data, resolvedFields, bins);
  const byStart = Object.fromEntries(derived.map((d) => [d.Horsepower_bin_start, d]));
  expect(byStart[46].Horsepower_bin_end).toEqual(50);
  expect(byStart[46].mean_Miles_per_Gallon).toEqual(26);
  expect(byStart[50].mean_Miles_per_Gallon).toEqual(27);
  expect(byStart[100].mean_Miles_per_Gallon).toEqual(18);
  expect(byStart[150].mean_Miles_per_Gallon).toEqual(15);
  // 230 is the domain max: inclusive right edge of the last (clipped) bin
  expect(byStart[200].Horsepower_bin_end).toEqual(230);
  expect(byStart[200].mean_Miles_per_Gallon).toEqual(9);
});

test('derivedDataset without bins keeps the vega bin transform behavior', () => {
  const resolvedFields = [
    { field: 'Horsepower', type: 'quantitative', bin: true },
    { field: 'Miles_per_Gallon', type: 'quantitative', aggregate: 'mean' },
  ] as any;
  const derived = derivedDataset(data, resolvedFields);
  // vega bin({maxbins: 10}) over [46, 230] uses step 20 from 40
  expect(derived.map((d) => d.Horsepower_bin_start)).toContain(40);
});
