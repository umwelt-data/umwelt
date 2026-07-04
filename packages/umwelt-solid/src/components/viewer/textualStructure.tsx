import { createEffect, createSignal, onCleanup } from 'solid-js';
import { umweltToOlliSpec } from '../../util/spec';
import { UmweltDataset, UmweltSpec } from '../../types';
import { olliVis, type OlliHandle } from 'olli';
import 'olli/styles.css';
import { useUmweltSelection } from '../../contexts/UmweltSelectionContext';

export type VisualizationProps = {
  spec: UmweltSpec;
  data: UmweltDataset;
};

export function TextualStructure(props: VisualizationProps) {
  const [umweltSelection, umweltSelectionActions] = useUmweltSelection();
  const [olliContainerRef, setOlliContainerRef] = createSignal<HTMLDivElement | null>(null);
  const [olliHandle, setOlliHandle] = createSignal<OlliHandle | null>(null);

  // olli re-homes focus whenever its selection changes (it rebuilds the nav
  // graph and refocuses the equivalent node), which fires onFocusChange. When we
  // push a selection into olli from another view (e.g. a visualization brush),
  // that incidental refocus must not be rebroadcast as a text-navigation
  // selection — it would clobber the very selection we just applied and, since
  // the refocus lands on the root, reset every view to unfiltered. Suppress
  // focus broadcasts for the synchronous reactive cascade our setSelection kicks
  // off; a genuine later user navigation resets past the microtask and still
  // broadcasts.
  let suppressFocusBroadcast = false;

  createEffect(() => {
    // guard against out-of-order resolution: a slow spec conversion kicked
    // off by an earlier run must not clobber the render from a newer run
    let stale = false;
    onCleanup(() => {
      stale = true;
    });
    umweltToOlliSpec(props.spec, props.data).then((olliSpec) => {
      const container = olliContainerRef();
      if (stale || !olliSpec || !container) return;

      olliHandle()?.destroy();
      container.innerHTML = '';

      const handle = olliVis(olliSpec, container);

      handle.onFocusChange((navId) => {
        if (suppressFocusBroadcast) return;
        const predicate = handle.fullPredicate(navId);
        if ('and' in predicate && predicate.and.length > 0) {
          umweltSelectionActions.setSelection({ source: 'text-navigation', predicate });
        } else {
          umweltSelectionActions.setSelection({ source: 'text-navigation', predicate: undefined });
        }
      });

      handle.onSelectionChange((selection) => {
        umweltSelectionActions.setSelection({ source: 'text-filter', predicate: selection });
      });

      setOlliHandle(handle);
    });
  });

  createEffect(() => {
    const sel = umweltSelection();
    const handle = olliHandle();
    if (sel && handle && sel.source === 'visualization') {
      suppressFocusBroadcast = true;
      handle.setSelection(sel.predicate ?? { and: [] });
      queueMicrotask(() => {
        suppressFocusBroadcast = false;
      });
    }
  });

  onCleanup(() => {
    olliHandle()?.destroy();
  });

  return <div ref={setOlliContainerRef} id="olli-container"></div>;
}
