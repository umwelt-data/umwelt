import { GroupMark, Scene, SceneGroup, View, parse } from 'vega';
import { VgSpec, VlSpec } from '../types';
import { compile } from 'vega-lite';
import cloneDeep from 'lodash.clonedeep';

export async function getVegaScene(spec: VgSpec): Promise<SceneGroup> {
  const runtime = parse(spec);
  let view = await new View(runtime).renderer('svg').hover().runAsync();

  return (view.scenegraph() as any).root.items[0] as SceneGroup;
}

export function editLinePointConditionalBehavior(vgSpec: VgSpec): VgSpec {
  vgSpec = cloneDeep(vgSpec);
  const line =
    // single line
    vgSpec.marks?.find((m) => m.name === 'layer_0_marks') ||
    // multiseries line
    (vgSpec.marks?.find((m) => m.name === 'layer_0_pathgroup') as GroupMark)?.marks?.find((m) => m.name === 'layer_0_marks');

  function updateLineCondition(channel: string) {
    const lineCondition = line?.encode?.update?.[channel];
    if (line && lineCondition && Array.isArray(lineCondition) && lineCondition.length) {
      // remove conditional from line e.g. make the line always solid
      const cond0 = lineCondition[0] as any;
      const { test, ...other } = cond0;
      if (line && line.encode && line.encode.update) {
        line.encode.update[channel] = other;
      }
    }
  }

  updateLineCondition('stroke');
  updateLineCondition('opacity');

  const symbol = vgSpec.marks?.find((m) => m.name === 'layer_1_marks');
  const symbolUpdate = symbol?.encode?.update;
  const symbolCondition = symbolUpdate?.fill;
  if (symbol && symbolUpdate && symbolCondition && Array.isArray(symbolCondition) && symbolCondition.length) {
    // always fill the symbol
    const cond0 = symbolCondition[0] as any;
    const { test, ...other } = cond0;
    if (line && line.encode && line.encode.update) {
      line.encode.update.stroke = other;
    }

    symbolUpdate.opacity = [{ test: 'vlSelectionTest("brush_store", datum) || vlSelectionTest("external_state_store", datum)', value: 1 }, { value: 0 }];
  }
  return vgSpec;
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
  if ('mark' in vlSpec && (vlSpec.mark as any).type === 'line' && (vlSpec.mark as any).point) {
    // TODO non-unit specs
    vgSpec = editLinePointConditionalBehavior(vgSpec);
  }
  const runtime = parse(vgSpec);
  const view = new View(runtime, {
    renderer: 'canvas',
    container: domSelector,
    hover: true,
  });
  view.runAsync();

  return view;
}

//

export function getVegaAxisTicks(view: { scenegraph: () => any }) {
  if (!view) {
    return null;
  }

  const scene = (view.scenegraph() as any).root.items[0] as SceneGroup;

  const axisTicks = findNodeByRole(scene, 'axis-tick');

  if (axisTicks.length) {
    const ticks = axisTicks.map((axis) => axis.items.map((n) => (n.datum as any)?.value));
    return ticks;
  }

  return null;
}

function findNodeByRole(node: SceneGroup | Scene, role: string, found: Scene[] = []): Scene[] {
  if ('role' in node) {
    if (node.role === role) {
      found.push(node);
    }
    return node.items.reduce((acc, n) => findNodeByRole(n, role, acc), found);
  }
  if ('items' in node) {
    return node.items.reduce((acc, n) => findNodeByRole(n, role, acc), found);
  }
  return found;
}
