import { Accessor, createEffect, createSignal } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { umweltToOlliSpec, umweltToVegaLiteSpec } from '../../util/spec';
import { UmweltDataset } from '../../types';
import { renderVegaLite } from '../../util/vega';
import { olli } from 'olli';

export type VisualizationProps = {};

export function TextualStructure(props: VisualizationProps) {
  const [spec, specActions] = useUmweltSpec();
  const [olliContainerRef, setOlliContainerRef] = createSignal<HTMLDivElement | null>(null);

  createEffect(async () => {
    const olliSpec = await umweltToOlliSpec(spec, spec.data.values);
    if (olliSpec) {
      const elem = olli(olliSpec, {
        onFocus: (_, node) => {
          // onTextNavPred(node.fullPredicate);
        },
        onSelection: (predicate) => {
          // onTextFilterPred(predicate as any);
        },
      });
      olliContainerRef()?.replaceChildren(elem);
    }
  });

  return <div ref={setOlliContainerRef} id="olli-container"></div>;
}
