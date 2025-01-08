import moize from 'moize';
import { AudioTraversalFieldDef, EncodingFieldDef, NONE, UmweltDataset, UmweltPredicate, UmweltValue } from '../types';
import { selectionTest } from './selection';
import { dateToFormattedString } from './description';
import { unwrapNone } from './values';

export const getDomain = moize((fieldDef: EncodingFieldDef | AudioTraversalFieldDef, data: UmweltDataset, predicate?: UmweltPredicate): UmweltValue[] => {
  const unique_vals = new Set<UmweltValue>();
  const dataset = predicate ? selectionTest(data, predicate) : data;
  // TODO account for domain overrides in the field def
  if ('timeUnit' in fieldDef && fieldDef.timeUnit) {
    const unique_time_vals = new Set<string>();
    dataset
      .map((d) => d[fieldDef.field])
      .forEach((v) => {
        if (v instanceof Date && 'timeUnit' in fieldDef && fieldDef.timeUnit) {
          const time_val = dateToFormattedString(v, unwrapNone(fieldDef.timeUnit));
          if (!unique_time_vals.has(time_val)) {
            unique_time_vals.add(time_val);
            unique_vals.add(v);
          }
        }
      });
  } else {
    const unique_time_vals = new Set<number>();
    dataset
      .map((d) => d[fieldDef.field])
      .forEach((v) => {
        if (v instanceof Date) {
          const time_val = v.getTime();
          if (!unique_time_vals.has(time_val)) {
            unique_time_vals.add(time_val);
            unique_vals.add(v);
          }
        } else {
          unique_vals.add(v);
        }
      });
  }
  return [...unique_vals].filter((x) => x !== null && x !== undefined).sort((a: any, b: any) => a - b);
});
