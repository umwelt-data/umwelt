import { describe, expect, it } from 'vitest';
import { selectionTest } from '../../src/util/selection';
import type { UmweltDataset, UmweltPredicate } from '../../src/types';

const data: UmweltDataset = [
  { mpg: 10, hp: 200 },
  { mpg: 20, hp: 150 },
  { mpg: 30, hp: 100 },
  { mpg: 40, hp: 60 },
];

describe('selectionTest', () => {
  it('filters by an equality predicate', () => {
    const pred: UmweltPredicate = { field: 'mpg', equal: 20 };
    expect(selectionTest(data, pred)).toEqual([{ mpg: 20, hp: 150 }]);
  });

  it('filters by an ascending inclusive range', () => {
    const pred: UmweltPredicate = { field: 'mpg', range: [20, 30], inclusiveLeft: true, inclusiveRight: true } as UmweltPredicate;
    expect(selectionTest(data, pred).map((d) => d.mpg)).toEqual([20, 30]);
  });

  it('filters by a multi-field AND (the shape a scatterplot brush produces)', () => {
    const pred: UmweltPredicate = {
      and: [
        { field: 'mpg', range: [15, 35], inclusiveLeft: true, inclusiveRight: true },
        { field: 'hp', range: [90, 160], inclusiveLeft: true, inclusiveRight: true },
      ],
    } as UmweltPredicate;
    expect(selectionTest(data, pred).map((d) => d.mpg)).toEqual([20, 30]);
  });

  // Regression rationale for the vl-bridge fix: a range predicate is [min, max]
  // by contract. A descending range (which an inverted y-scale brush produces
  // before normalization) matches nothing — which is exactly why
  // selectionStoreToSelection must normalize before the predicate reaches here.
  it('matches nothing when a range is descending (contract: ranges must be ascending)', () => {
    const pred: UmweltPredicate = { field: 'hp', range: [160, 90], inclusiveLeft: true, inclusiveRight: true } as UmweltPredicate;
    expect(selectionTest(data, pred)).toEqual([]);
    const normalized: UmweltPredicate = { field: 'hp', range: [90, 160], inclusiveLeft: true, inclusiveRight: true } as UmweltPredicate;
    expect(selectionTest(data, normalized).map((d) => d.hp)).toEqual([150, 100]);
  });
});
