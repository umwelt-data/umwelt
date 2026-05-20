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

  createEffect(() => {
    umweltToOlliSpec(props.spec, props.data).then((olliSpec) => {
      const container = olliContainerRef();
      if (!olliSpec || !container) return;

      olliHandle()?.destroy();
      container.innerHTML = '';

      const handle = olliVis(olliSpec, container);

      handle.onFocusChange((navId) => {
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
      if (sel.predicate) {
        handle.setSelection(sel.predicate);
      } else {
        handle.setSelection({ and: [] });
      }
    }
  });

  onCleanup(() => {
    olliHandle()?.destroy();
  });

  return <div ref={setOlliContainerRef} id="olli-container"></div>;
}
