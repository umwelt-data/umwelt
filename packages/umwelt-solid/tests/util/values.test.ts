import { describe, expect, it } from 'vitest';
import { clamp, filterObjectByKeys, rangesAreEqual } from '../../src/util/values';
import type { FieldDef } from '../../src/types';

describe('clamp', () => {
  it('returns the value when within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps below the minimum', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });
  it('clamps above the maximum', () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });
});

describe('filterObjectByKeys', () => {
  it('keeps only the listed keys', () => {
    expect(filterObjectByKeys({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });
  it('ignores keys that are not present', () => {
    expect(filterObjectByKeys({ a: 1 }, ['a', 'missing'])).toEqual({ a: 1 });
  });
  it('returns an empty object when no keys match', () => {
    expect(filterObjectByKeys({ a: 1 }, [])).toEqual({});
  });
});

describe('rangesAreEqual', () => {
  const field = { field: 'x', type: 'quantitative' } as unknown as FieldDef;

  it('is true for identical numeric ranges', () => {
    expect(rangesAreEqual([1, 2], [1, 2], field)).toBe(true);
  });
  it('is false for differing ranges', () => {
    expect(rangesAreEqual([1, 2], [1, 3], field)).toBe(false);
  });
  it('is false when either argument is not an array', () => {
    expect(rangesAreEqual(null as any, [1, 2], field)).toBe(false);
    expect(rangesAreEqual([1, 2], undefined as any, field)).toBe(false);
  });
});
