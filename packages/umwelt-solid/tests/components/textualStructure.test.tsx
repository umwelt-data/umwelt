import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@solidjs/testing-library';
import { UmweltSelectionProvider, useUmweltSelection, type UmweltSelectionActions } from '../../src/contexts/UmweltSelectionContext';
import type { UmweltSelection } from '../../src/contexts/UmweltSelectionContext';
import type { Accessor } from 'solid-js';
import type { UmweltDataset, UmweltSpec } from '../../src/types';

// Shared across the hoisted olli mock and the tests.
const olliState = vi.hoisted(() => ({ handles: [] as any[] }));

// Fake olli handle. Crucially it reproduces olli's real behavior: setSelection
// re-homes focus (to the root here) and therefore fires onFocusChange — the
// exact source of the feedback loop the component must suppress.
vi.mock('olli', () => ({
  olliVis: vi.fn(() => {
    const focusCbs: ((id: string) => void)[] = [];
    const handle: any = {
      focusCbs,
      setSelectionCalls: [] as unknown[],
      onFocusChange: (cb: (id: string) => void) => {
        focusCbs.push(cb);
        return () => {};
      },
      onSelectionChange: () => () => {},
      fullPredicate: (navId: string) => (navId === 'root' ? { and: [] } : { and: [{ field: 'mpg', equal: 20 }] }),
      setSelection: (sel: unknown) => {
        handle.setSelectionCalls.push(sel);
        focusCbs.forEach((cb) => cb('root')); // olli refocuses to root -> fires onFocusChange
      },
      getSelection: () => ({ and: [] }),
      focus: () => {},
      getFocusedNavId: () => 'root',
      getDescription: () => '',
      setCustomization: () => {},
      applyPreset: () => {},
      destroy: () => {},
    };
    olliState.handles.push(handle);
    return handle;
  }),
}));

// Skip the real (async, vega-heavy) spec conversion; the mocked olli ignores it.
vi.mock('../../src/util/spec', () => ({ umweltToOlliSpec: vi.fn().mockResolvedValue({ ok: true }) }));

import { TextualStructure } from '../../src/components/viewer/textualStructure';

const flushMacrotask = () => new Promise<void>((r) => setTimeout(r, 0));

let sel: Accessor<UmweltSelection | undefined>;
let actions: UmweltSelectionActions;

function Capture() {
  const [s, a] = useUmweltSelection();
  sel = s;
  actions = a;
  return null;
}

async function setup() {
  render(() => (
    <UmweltSelectionProvider>
      <Capture />
      <TextualStructure spec={{} as UmweltSpec} data={[] as UmweltDataset} />
    </UmweltSelectionProvider>
  ));
  await waitFor(() => expect(olliState.handles.length).toBe(1));
  return olliState.handles[0];
}

describe('TextualStructure visualization -> olli coordination', () => {
  beforeEach(() => {
    olliState.handles.length = 0;
  });

  it('pushes a visualization selection into olli', async () => {
    const handle = await setup();
    const predicate = { field: 'mpg', equal: 20 } as any;
    actions.setSelection({ source: 'visualization', predicate });
    await flushMacrotask();
    expect(handle.setSelectionCalls).toContainEqual(predicate);
  });

  // Regression: applying the visualization selection makes olli refocus (to
  // root) and fire onFocusChange. That incidental focus change must NOT be
  // rebroadcast as a text-navigation selection, which would clear the very
  // selection we just applied (this is what silently reset the sonification).
  it('does not let olli\'s refocus clobber the visualization selection', async () => {
    await setup();
    const predicate = { field: 'mpg', equal: 20 } as any;
    actions.setSelection({ source: 'visualization', predicate });
    await flushMacrotask();
    expect(sel()).toEqual({ source: 'visualization', predicate });
  });

  // The suppression must be scoped: a genuine later user navigation of the tree
  // still broadcasts a text-navigation selection.
  it('still broadcasts a real user focus change after the suppression window', async () => {
    const handle = await setup();
    actions.setSelection({ source: 'visualization', predicate: { field: 'mpg', equal: 20 } as any });
    await flushMacrotask(); // lets the queueMicrotask reset run

    // simulate the user navigating to a non-root node (fires olli's focus cb)
    handle.focusCbs[0]('nav-node-1');
    expect(sel()?.source).toBe('text-navigation');
    expect(sel()?.predicate).toEqual({ and: [{ field: 'mpg', equal: 20 }] });

    // navigating back to root clears the selection
    handle.focusCbs[0]('root');
    expect(sel()).toEqual({ source: 'text-navigation', predicate: undefined });
  });
});
