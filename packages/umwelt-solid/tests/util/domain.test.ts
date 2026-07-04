import { describe, expect, it } from 'vitest';
import { getBinnedDomain, getDomain } from '../../src/util/domain';
import type { ResolvedFieldDef, UmweltDataset } from '../../src/types';

const resolved = (f: Partial<ResolvedFieldDef>): ResolvedFieldDef => f as ResolvedFieldDef;

describe('getDomain', () => {
  it('returns unique values sorted ascending, dropping nulls', () => {
    const data: UmweltDataset = [{ x: 3 }, { x: 1 }, { x: 1 }, { x: null }, { x: 2 }];
    expect(getDomain(resolved({ field: 'x', type: 'quantitative' }), data)).toEqual([1, 2, 3]);
  });

  it('reads the derived (binned) field name when derive is true', () => {
    // derivedFieldName of a binned, non-aggregate field is `${field}_bin_start`
    const data: UmweltDataset = [{ x_bin_start: 10 }, { x_bin_start: 0 }, { x_bin_start: 10 }];
    expect(getDomain(resolved({ field: 'x', type: 'quantitative', bin: true }), data, true)).toEqual([0, 10]);
  });

  it('sorts strings lexicographically', () => {
    const data: UmweltDataset = [{ c: 'b' }, { c: 'a' }, { c: 'c' }];
    expect(getDomain(resolved({ field: 'c', type: 'nominal' }), data)).toEqual(['a', 'b', 'c']);
  });
});

describe('getBinnedDomain', () => {
  it('returns [start, end] pairs sorted by start', () => {
    const data: UmweltDataset = [
      { x_bin_start: 10, x_bin_end: 20 },
      { x_bin_start: 0, x_bin_end: 10 },
    ];
    expect(getBinnedDomain(resolved({ field: 'x', type: 'quantitative', bin: true }), data)).toEqual([
      [0, 10],
      [10, 20],
    ]);
  });

  it('returns an empty array for a non-binned field', () => {
    const data: UmweltDataset = [{ x: 1 }];
    expect(getBinnedDomain(resolved({ field: 'x', type: 'quantitative' }), data)).toEqual([]);
  });
});
