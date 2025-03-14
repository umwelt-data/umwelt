import { createEffect, createSignal } from 'solid-js';
import { umweltToOlliSpec } from '../../util/spec';
import { UmweltSpec } from '../../types';
import { olli, OlliGlobalState } from 'olli';
import { useUmweltSelection } from '../../contexts/UmweltSelectionContext';

export type VisualizationProps = {
  spec: UmweltSpec;
};

export function TextualStructure(props: VisualizationProps) {
  const [umweltSelection, umweltSelectionActions] = useUmweltSelection();
  const [olliContainerRef, setOlliContainerRef] = createSignal<HTMLDivElement | null>(null);

  createEffect(() => {
    umweltToOlliSpec(props.spec, props.spec.data.values).then((olliSpec) => {
      if (olliSpec) {
        if (((window as any)._olli as OlliGlobalState)?.instancesOnPage) {
          // TODO we should fix this jank in olli
          ((window as any)._olli as OlliGlobalState).instancesOnPage = [];
        }
        const elem = olli(olliSpec, {
          onFocus: (_, node) => {
            if (node.fullPredicate.and && node.fullPredicate.and.length > 0) {
              //@ts-ignore // TODO: this is something dumb with the types in olli and umwelt being out of sync
              umweltSelectionActions.setSelection({ source: 'text-navigation', predicate: node.fullPredicate });
            } else {
              umweltSelectionActions.setSelection({ source: 'text-navigation', predicate: undefined });
            }
          },
          onSelection: (predicate) => {
            //@ts-ignore // TODO: this is something dumb with the types in olli and umwelt being out of sync
            umweltSelectionActions.setSelection({ source: 'text-filter', predicate });
          },
        });
        olliContainerRef()?.replaceChildren(elem);
      }
    });
  });

  createEffect(() => {
    const sel = umweltSelection();
    if (sel && sel.source === 'visualization') {
      //@ts-ignore // TODO: this is something dumb with the types in olli and umwelt being out of sync
      ((window as any)._olli as OlliGlobalState).instancesOnPage[0].setSelection(sel.predicate);
    }
  });

  return <div ref={setOlliContainerRef} id="olli-container"></div>;
}
