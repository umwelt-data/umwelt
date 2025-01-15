import { Accessor, createEffect } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { umweltToVegaLiteSpec } from '../../util/spec';
import { UmweltDataset } from '../../types';
import { renderVegaLite } from '../../util/vega';

export type VisualizationProps = {};

export function Visualization(props: VisualizationProps) {
  const [spec, specActions] = useUmweltSpec();

  createEffect(() => {
    const vlSpec = umweltToVegaLiteSpec(spec, spec.data.values);
    console.log('yo');
    if (vlSpec) {
      console.log(JSON.parse(JSON.stringify(vlSpec)));
      try {
        const view = renderVegaLite(vlSpec, '#vl-container');

        // view.addDataListener('brush_store', (_: any, value: any) => {
        //   updateValue(value);
        // });

        (window as any).view = view;
      } catch (e) {
        console.error(e);
      }
    } else {
      (window as any).view?.finalize();
      document.getElementById('vl-container')!.innerHTML = '';
    }
  });

  const handleMouseMove = (e: MouseEvent) => {};

  return <div id="vl-container" onMouseMove={handleMouseMove}></div>;
}
