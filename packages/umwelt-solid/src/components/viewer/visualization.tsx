import { createEffect, createSignal, onCleanup } from 'solid-js';
import { umweltToVegaLiteSpec } from '../../util/spec';
import { UmweltSpec } from '../../types';
import { renderVegaLite } from '../../util/vega';
import { debounce } from '@solid-primitives/scheduled';
import { useUmweltSelection } from '../../contexts/UmweltSelectionContext';
import { predicateToSelectionStore, selectionStoreToSelection, VlSelectionStore } from '../../util/selection';

export type VisualizationProps = {
  spec: UmweltSpec;
};

export function Visualization(props: VisualizationProps) {
  const [umweltSelection, umweltSelectionActions] = useUmweltSelection();
  const [isMouseOver, setIsMouseOver] = createSignal(false);

  const onSelectionStore = debounce((store: VlSelectionStore) => {
    // Update the selection when the brush store changes
    if (isMouseOver()) {
      const predicate = selectionStoreToSelection(store);
      umweltSelectionActions.setSelection({ source: 'visualization', predicate });
    }
  }, 250);

  createEffect(() => {
    // Update the view when the selection changes
    const sel = umweltSelection();
    const view = (window as any).view;
    if (!sel) {
      if (view) {
        view.data('external_state_store', undefined).run();
      }
      return;
    }

    if (!view) return;

    if (sel.source === 'sonification' || sel.source === 'text-navigation') {
      if (sel.predicate) {
        const store = predicateToSelectionStore(sel.predicate);
        view.data('external_state_store', store).run();
      } else {
        view.data('external_state_store', undefined).run();
      }
    }
  });

  createEffect(() => {
    const vlSpec = umweltToVegaLiteSpec(props.spec, props.spec.data.values);

    if (vlSpec) {
      try {
        const view = renderVegaLite(vlSpec, '#vl-container');

        view.addDataListener('brush_store', (_: any, value: VlSelectionStore) => {
          onSelectionStore(value);
        });

        (window as any).view = view;
      } catch (e) {
        console.error(e);
      }
    }
    onCleanup(() => {
      (window as any).view?.finalize();
      (window as any).view = null;
      document.getElementById('vl-container')!.innerHTML = '';
    });
  });

  const onMouseEnter = () => {
    setIsMouseOver(true);
  };
  const onMouseLeave = () => {
    setIsMouseOver(false);
  };

  return <div id="vl-container" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}></div>;
}
