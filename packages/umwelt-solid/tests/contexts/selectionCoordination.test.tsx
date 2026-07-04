import { describe, expect, it } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { ParentProps } from 'solid-js';
import { UmweltSelectionProvider, useUmweltSelection } from '../../src/contexts/UmweltSelectionContext';
import { SonificationStateProvider, useSonificationState } from '../../src/contexts/sonification/SonificationStateContext';
import type { UmweltPredicate } from '../../src/types';

// let queued Solid effects run
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

function wrapper(props: ParentProps) {
  return (
    <UmweltSelectionProvider>
      <SonificationStateProvider>{props.children}</SonificationStateProvider>
    </UmweltSelectionProvider>
  );
}

function setup() {
  const { result } = renderHook(
    () => ({ selection: useUmweltSelection(), sonification: useSonificationState() }),
    { wrapper },
  );
  return result;
}

describe('visualization/text selection -> sonification coordination', () => {
  it('mirrors a visualization selection into the sonification selection', async () => {
    const { selection, sonification } = setup();
    const [, selectionActions] = selection;
    const [sonState] = sonification;

    const predicate: UmweltPredicate = { field: 'hp', range: [90, 160], inclusiveLeft: true, inclusiveRight: true } as UmweltPredicate;
    selectionActions.setSelection({ source: 'visualization', predicate });
    await flush();

    expect(sonState.selection).toEqual(predicate);
  });

  it('mirrors a text-filter selection into the sonification selection', async () => {
    const { selection, sonification } = setup();
    const [, selectionActions] = selection;
    const [sonState] = sonification;

    const predicate: UmweltPredicate = { field: 'origin', equal: 'USA' };
    selectionActions.setSelection({ source: 'text-filter', predicate });
    await flush();

    expect(sonState.selection).toEqual(predicate);
  });

  // The sonification is itself a selection source (it broadcasts while playing).
  // Feeding its own selection back into its filter would double-apply it, so a
  // 'sonification'-sourced selection must NOT update the sonification filter.
  it('ignores a sonification-sourced selection (no feedback into its own filter)', async () => {
    const { selection, sonification } = setup();
    const [, selectionActions] = selection;
    const [sonState] = sonification;

    const predicate: UmweltPredicate = { field: 'hp', equal: 100 };
    selectionActions.setSelection({ source: 'sonification', predicate });
    await flush();

    expect(sonState.selection).toBeUndefined();
  });

  it('clears the sonification selection when the shared selection is cleared', async () => {
    const { selection, sonification } = setup();
    const [, selectionActions] = selection;
    const [sonState] = sonification;

    selectionActions.setSelection({ source: 'visualization', predicate: { field: 'hp', equal: 100 } });
    await flush();
    expect(sonState.selection).toBeDefined();

    selectionActions.setSelection({ source: 'text-navigation', predicate: undefined });
    await flush();
    expect(sonState.selection).toBeUndefined();
  });
});
