import { createEffect, createSignal, onCleanup } from 'solid-js';
import { umweltToVegaLiteSpec } from '../../util/spec';
import { UmweltDataset, UmweltSpec } from '../../types';
import { renderVegaLite } from '../../util/vega';
import { debounce } from '@solid-primitives/scheduled';
import { useUmweltSelection } from '../../contexts/UmweltSelectionContext';
import { predicateToSelectionStore, selectionStoreToSelection, EXTERNAL_STATE_STORE, type VlSelectionStore } from '@umwelt-data/umwelt-utils/vl-bridge';
import type { View } from 'vega';

export type VisualizationProps = {
  spec: UmweltSpec;
  data: UmweltDataset;
};

export function Visualization(props: VisualizationProps) {
  const [umweltSelection, umweltSelectionActions] = useUmweltSelection();
  const [isMouseOver, setIsMouseOver] = createSignal(false);
  const [vegaView, setVegaView] = createSignal<View | null>(null);
  const [vlContainerRef, setVlContainerRef] = createSignal<HTMLDivElement | null>(null);

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
        view.data(EXTERNAL_STATE_STORE, []).run();
      }
      return;
    }

    if (!view) return;

    if (sel.source === 'sonification' || sel.source === 'text-navigation') {
      const tuple = predicateToSelectionStore(sel.predicate);
      view.data(EXTERNAL_STATE_STORE, tuple ? [tuple] : []).run();
    }
  });

  createEffect(() => {
    const vlSpec = umweltToVegaLiteSpec(props.spec, props.data);
    const container = vlContainerRef();

    if (vlSpec && container) {
      try {
        const view = renderVegaLite(vlSpec, container);

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
      const el = vlContainerRef();
      if (el) el.innerHTML = '';
    });
  });

  return (
    <div
      ref={setVlContainerRef}
      class="uw-vl-container"
      onMouseEnter={() => setIsMouseOver(true)}
      onMouseLeave={() => setIsMouseOver(false)}
    ></div>
  );
}
