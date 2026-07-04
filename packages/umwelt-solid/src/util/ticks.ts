import { GuideTicksConfig, computeGuideTicks } from '@umwelt-data/umwelt-utils/vega';
import { getBins } from '@umwelt-data/umwelt-utils/data';
import { ResolvedFieldDef, UmweltDataset, UmweltSpec, UmweltValue } from '../types';
import { getFieldDef, resolveFieldDef } from './spec';

/**
 * Ticks for the chart axis that displays `field`, mirroring how olli's
 * VegaLiteAdapter configures computeGuideTicks from the compiled vega-lite
 * encoding — so anything derived from ticks (bins, announcements) matches the
 * olli tree. Returns undefined if the field has no x/y encoding.
 */
export function chartAxisTicks(spec: UmweltSpec, data: UmweltDataset, field: string): UmweltValue[] | undefined {
  const fieldDef = getFieldDef(spec, field);
  if (!fieldDef) return undefined;
  const ref = fieldDef.encodings.find((e) => e.property === 'x' || e.property === 'y');
  if (!ref) return undefined;
  const unit = spec.visual.units.find((u) => u.name === ref.unit);
  const encDef = unit?.encoding[ref.property as 'x' | 'y'];
  if (!unit || !encDef) return undefined;
  const resolved = resolveFieldDef(fieldDef, encDef);
  // umweltToVegaLiteSpec disables zero on quantitative point-mark axes
  const scaleZero = unit.mark === 'point' && resolved.type === 'quantitative' ? false : resolved.scale?.zero;
  const scaleDomain = Array.isArray(resolved.scale?.domain) ? resolved.scale?.domain : undefined;
  const config: GuideTicksConfig = {
    field,
    type: resolved.type as GuideTicksConfig['type'],
    bin: !!resolved.bin,
    timeUnit: resolved.timeUnit,
    scaleZero,
    scaleDomain,
    // vega-lite sorts discrete scales ascending unless told otherwise
    sort: resolved.sort === undefined ? 'ascending' : (resolved.sort as GuideTicksConfig['sort']),
  };
  return computeGuideTicks(data as Record<string, any>[], config) as UmweltValue[] | undefined;
}

/**
 * Tick-aligned bins for every binned quantitative field an audio unit uses,
 * computed with the same getBins olli uses so sonification bins match the
 * olli tree. Axis ticks come from the full dataset (the chart's axis doesn't
 * change with selections) while the bins are clipped to the current data's
 * domain, matching how olli re-lowers filtered data against fixed axis ticks.
 */
export function audioUnitFieldBins(spec: UmweltSpec, fullData: UmweltDataset, currentData: UmweltDataset, resolvedFields: ResolvedFieldDef[]): Record<string, [number, number][]> {
  const bins: Record<string, [number, number][]> = {};
  for (const def of resolvedFields) {
    if (def.bin && def.type === 'quantitative' && !(def.field in bins)) {
      const fieldDef = { field: def.field, type: def.type };
      let fieldBins = getBins(fieldDef, currentData, chartAxisTicks(spec, fullData, def.field));
      if (fieldBins.length === 0) {
        // constant field (olli produces no bins); one bin keeps the traversal playable
        let min = Infinity;
        let max = -Infinity;
        for (const d of currentData) {
          const raw = d[def.field];
          if (raw == null) continue;
          const n = Number(raw);
          if (isNaN(n)) continue;
          if (n < min) min = n;
          if (n > max) max = n;
        }
        if (min <= max) {
          fieldBins = [[min, max]];
        }
      }
      bins[def.field] = fieldBins;
    }
  }
  return bins;
}
