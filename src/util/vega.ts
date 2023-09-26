import { SceneGroup, View, parse } from 'vega';
import { VgSpec } from '../types';

export async function getVegaScene(spec: VgSpec): Promise<SceneGroup> {
  const runtime = parse(spec);
  let view = await new View(runtime).renderer('svg').hover().runAsync();

  return (view.scenegraph() as any).root.items[0] as SceneGroup;
}
