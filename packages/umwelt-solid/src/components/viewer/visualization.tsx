import { createEffect, createSignal, onCleanup } from 'solid-js';
import { umweltToVegaLiteSpec } from '../../util/spec';
import { UmweltDataset, UmweltSpec } from '../../types';
import { renderVegaLite } from '../../util/vega';
import { debounce } from '@solid-primitives/scheduled';
import { useUmweltSelection } from '../../contexts/UmweltSelectionContext';
import { predicateToSelectionStore, selectionStoreToSelection, VlSelectionStore } from '../../util/selection';
import type { View } from 'vega';

export type VisualizationProps = {
  spec: UmweltSpec;
  data: UmweltDataset;
};

export function Visualization(props: VisualizationProps) {
  const [umweltSelection, umweltSelectionActions] = useUmweltSelection();
  const [isMouseOver, setIsMouseOver] = createSignal(false);
  const [vegaView, setVegaView] = createSignal<View | null>(null);

  const onSelectionStore = debounce((store: VlSelectionStore) => {
    if (isMouseOver()) {
      const predicate = selectionStoreToSelection(store);
      umweltSelectionActions.setSelection({ source: 'visualization', predicate });
    }
  }, 250);

  createEffect(() => {
    const sel = umweltSelection();
    const view = vegaView();
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
    const vlSpec = umweltToVegaLiteSpec(props.spec, props.data);

    if (vlSpec) {
      try {
        const view = renderVegaLite(vlSpec, '#vl-container');

        view.addDataListener('brush_store', (_: any, value: VlSelectionStore) => {
          onSelectionStore(value);
        });

        setVegaView(view);
      } catch (e) {
        console.error(e);
      }
    }
    onCleanup(() => {
      vegaView()?.finalize();
      setVegaView(null);
      document.getElementById('vl-container')!.innerHTML = '';
    });
  });

  return (
    <div
      id="vl-container"
      onMouseEnter={() => setIsMouseOver(true)}
      onMouseLeave={() => setIsMouseOver(false)}
    ></div>
  );
}
