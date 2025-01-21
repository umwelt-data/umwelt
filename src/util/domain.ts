import moize from 'moize';
import { AudioTraversalFieldDef, ResolvedFieldDef, EncodingFieldDef, NONE, UmweltDataset, UmweltPredicate, UmweltValue } from '../types';
import { selectionTest } from './selection';
import { dateToFormattedString } from './description';

// TODO should this function account for overrides between the parent field def and the encoding field def?
export const getDomain = moize((fieldDef: ResolvedFieldDef, data: UmweltDataset, predicate?: UmweltPredicate): UmweltValue[] => {
  // TODO apply binning and aggregation
  // TODO account for domain overrides in the field def
  const dataset = predicate ? selectionTest(data, predicate) : data;
  const uniqueVals = new Map<any, UmweltValue>();

  dataset.forEach((d) => {
    const value = d[fieldDef.field];

    if (value instanceof Date) {
      const timeUnit = fieldDef.timeUnit ? dateToFormattedString(value, fieldDef.timeUnit) : value.getTime();
      if (!uniqueVals.has(timeUnit)) {
        uniqueVals.set(timeUnit, value);
      }
    } else if (!uniqueVals.has(value)) {
      uniqueVals.set(value, value);
    }
  });

  return Array.from(uniqueVals.values())
    .filter((x) => x !== null && x !== undefined)
    .sort((a: UmweltValue, b: UmweltValue) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
      }
      if (a instanceof Date && b instanceof Date) {
        return a.getTime() - b.getTime();
      }
      if (typeof a === 'string' && typeof b === 'string') {
        return a.localeCompare(b);
      }
      return 0; // Keep original order for unsupported types
    });
});
