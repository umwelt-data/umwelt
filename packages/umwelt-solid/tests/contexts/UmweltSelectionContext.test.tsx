import { describe, expect, it } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { UmweltSelectionProvider, useUmweltSelection } from '../../src/contexts/UmweltSelectionContext';
import type { UmweltPredicate } from '../../src/types';

describe('UmweltSelectionContext', () => {
  it('stores a selection with its source and predicate', () => {
    const { result } = renderHook(useUmweltSelection, { wrapper: UmweltSelectionProvider });
    const [selection, actions] = result;
    const predicate: UmweltPredicate = { field: 'x', equal: 1 };
    actions.setSelection({ source: 'visualization', predicate });
    expect(selection()).toEqual({ source: 'visualization', predicate });
  });

  it('normalizes an empty AND predicate to undefined (no selection)', () => {
    const { result } = renderHook(useUmweltSelection, { wrapper: UmweltSelectionProvider });
    const [selection, actions] = result;
    actions.setSelection({ source: 'text-navigation', predicate: { and: [] } });
    expect(selection()).toEqual({ source: 'text-navigation', predicate: undefined });
  });

  it('keeps a non-empty AND predicate intact', () => {
    const { result } = renderHook(useUmweltSelection, { wrapper: UmweltSelectionProvider });
    const [selection, actions] = result;
    const predicate: UmweltPredicate = { and: [{ field: 'x', equal: 1 }] };
    actions.setSelection({ source: 'visualization', predicate });
    expect(selection()?.predicate).toEqual(predicate);
  });
});
