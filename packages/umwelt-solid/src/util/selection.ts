import type { ResolvedFieldDef, UmweltDataset, UmweltPredicate, UmweltSpec } from '../types';
import { testDatum } from '@umwelt-data/umwelt-utils/predicate';
import { chartAxisEncodingFieldDef } from './ticks';

export function selectionTest(data: UmweltDataset, predicate: UmweltPredicate): UmweltDataset {
  return data.filter((datum) => testDatum(datum as Record<string, unknown>, predicate));
}

const toMillis = (v: any) => (v == null ? v : v instanceof Date ? v.getTime() : new Date(v).getTime());

// The vega-lite column a positional encoding compiles to, given its transform.
// Mirrors olli's VegaLiteAdapter getFieldFromEncoding: aggregate and timeUnit
// are name-derivable, but bin's column embeds vega's chosen maxbins
// (`bin_maxbins_10_x`), so it is discovered by scanning the compiled columns.
function compiledMarkField(enc: ResolvedFieldDef, field: string, columns: string[]): string {
  if (enc.aggregate) return `${enc.aggregate}_${field}`;
  if (enc.timeUnit) return `${enc.timeUnit}_${field}`;
  if (enc.bin) {
    return columns.find((c) => c.startsWith('bin') && c.includes(field) && !c.endsWith('_end')) ?? field;
  }
  return field;
}

/**
 * Rewrite a sonification selection (built in raw-field space, e.g. `Horsepower`
 * or `date`) onto the transformed columns the chart's compiled marks actually
 * carry (`bin_maxbins_10_Horsepower`, `yearmonth_date`, …), so the external-state
 * selection matches binned/timeUnit'd/aggregated marks. `columns` are the field
 * names present in the chart's compiled datasets. Only fields on a positional
 * axis are rewritten; everything else (raw marks, non-axis channels) is left
 * untouched, matching how those marks already highlight. Predicates that come
 * from olli (text navigation) are already compiled and must not be passed here.
 */
export function predicateToChartFields(spec: UmweltSpec, predicate: UmweltPredicate | undefined, columns: string[]): UmweltPredicate | undefined {
  if (!predicate) return predicate;
  const rewrite = (p: any): any => {
    if (!p || typeof p !== 'object') return p;
    if ('and' in p) return { and: p.and.map(rewrite) };
    if ('or' in p) return { or: p.or.map(rewrite) };
    if ('not' in p) return { not: rewrite(p.not) };
    if (!('field' in p)) return p;
    const enc = chartAxisEncodingFieldDef(spec, p.field);
    if (!enc) return p;
    const compiled = compiledMarkField(enc, p.field, columns);
    const next: any = compiled === p.field ? { ...p } : { ...p, field: compiled };
    // vega stores temporal columns as epoch millis; coerce leaf values so an
    // equal/range on a temporal (incl. timeUnit'd) field compares numerically
    if (enc.type === 'temporal') {
      if ('equal' in next) next.equal = toMillis(next.equal);
      if ('range' in next && Array.isArray(next.range)) next.range = next.range.map(toMillis);
    }
    return next;
  };
  return rewrite(predicate);
}
