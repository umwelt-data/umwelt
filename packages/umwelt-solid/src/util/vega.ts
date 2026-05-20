import { SceneGroup, View, parse } from 'vega';
import { VgSpec, VlSpec } from '../types';
import { compile } from 'vega-lite';

export async function getVegaScene(spec: VgSpec): Promise<SceneGroup> {
  const runtime = parse(spec);
  let view = await new View(runtime).renderer('svg').hover().runAsync();
  return (view.scenegraph() as any).root.items[0] as SceneGroup;
}

export function renderVegaLite(vlSpec: VlSpec, domSelector: string) {
  let vgSpec = compile(vlSpec).spec;
  vgSpec.signals = (vgSpec.signals || [])
    .map((signal) => {
      if (signal.name === 'external_state_modify') {
        return {
          name: 'external_state_modify',
          update: 'false',
        };
      }
      return signal;
    })
    .filter((signal, idx, self) => {
      return self.findIndex((s) => s.name === signal.name) === idx;
    });
  const runtime = parse(vgSpec);
  const view = new View(runtime, {
    renderer: 'canvas',
    container: domSelector,
    hover: true,
  });
  view.runAsync();

  return view;
}
