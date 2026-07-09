import { GuideTicksConfig, computeGuideTicks } from '@umwelt-data/umwelt-utils/vega';
import { getBins } from '@umwelt-data/umwelt-utils/data';
import { ResolvedFieldDef, UmweltDataset, UmweltSpec, UmweltValue } from '../types';
import { getFieldDef, resolveFieldDef } from './spec';
import { applyTransforms, timeUnitFieldName } from './transforms';
import type { TimeUnit } from 'vega-lite/build/src/timeunit';

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
    scaleZero,
    scaleDomain,
    // vega-lite sorts discrete scales ascending unless told otherwise
    sort: resolved.sort === undefined ? 'ascending' : (resolved.sort as GuideTicksConfig['sort']),
  };
  // A timeUnit'd temporal axis is compiled by vega-lite over the bucketed
  // column, and olli computes its ticks from that compiled data — so run the
  // same timeUnit transform here and tick over the bucketed field. Ticking the
  // raw field instead would put the ticks in a different date space than the
  // month/year/... bucketed values everything downstream compares against.
  if (resolved.type === 'temporal' && resolved.timeUnit && !resolved.bin && !resolved.aggregate) {
    // resolveFieldDef filters NONE out, so a present timeUnit is a real one
    const timeUnit = resolved.timeUnit as TimeUnit;
    const bucketedField = timeUnitFieldName(field, timeUnit);
    const bucketedData = applyTransforms(data, [{ timeUnit, field, as: bucketedField }]);
    return computeGuideTicks(bucketedData as Record<string, any>[], { ...config, field: bucketedField }) as UmweltValue[] | undefined;
  }
  return computeGuideTicks(data as Record<string, any>[], config) as UmweltValue[] | undefined;
}

/**
 * The resolved field def of `field`'s chart x/y encoding, or undefined if the
 * field is not on a positional axis. Captures the transform (bin/timeUnit/
 * aggregate) the chart marks were compiled with — the basis for both bin
 * alignment and mapping a raw-field predicate onto the compiled mark columns.
 */
export function chartAxisEncodingFieldDef(spec: UmweltSpec, field: string): ResolvedFieldDef | undefined {
  const fieldDef = getFieldDef(spec, field);
  if (!fieldDef) return undefined;
  const ref = fieldDef.encodings.find((e) => e.property === 'x' || e.property === 'y');
  if (!ref) return undefined;
  const unit = spec.visual.units.find((u) => u.name === ref.unit);
  const encDef = unit?.encoding[ref.property as 'x' | 'y'];
  if (!encDef) return undefined;
  return resolveFieldDef(fieldDef, encDef);
}

/**
 * True when `field` is displayed on a chart x/y axis that is itself binned.
 * Such a field is bucketed by olli with vega-lite's bin transform (equal-width,
 * default maxbins), not by axis ticks — so its audio bins must come from the
 * same transform, never from tick alignment.
 */
export function isFieldBinnedOnChartAxis(spec: UmweltSpec, field: string): boolean {
  return !!chartAxisEncodingFieldDef(spec, field)?.bin;
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
      // A field already binned on its chart axis is bucketed by olli's vega-lite
      // bin transform; leaving it out here lets derivedDataset apply that same
      // transform, so audio and olli agree. Only fields binned in audio but shown
      // on an unbinned axis need tick-aligned bins computed here.
      if (isFieldBinnedOnChartAxis(spec, def.field)) continue;
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
