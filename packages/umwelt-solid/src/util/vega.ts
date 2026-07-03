import { View, parse } from 'vega';
import { VlSpec } from '../types';
import { compile } from 'vega-lite';

export function renderVegaLite(vlSpec: VlSpec, domSelector: string) {
  const vgSpec = compile(vlSpec).spec;
  const runtime = parse(vgSpec);
  const view = new View(runtime, {
    renderer: 'canvas',
    container: domSelector,
    hover: true,
  });
  view.runAsync();

  return view;
}
