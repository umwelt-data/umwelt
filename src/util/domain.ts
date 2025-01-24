import moize from 'moize';
import { ResolvedFieldDef, UmweltDataset, UmweltPredicate, UmweltValue } from '../types';
import { selectionTest } from './selection';
import { dateToFormattedString } from './description';
import { derivedFieldName } from './transforms';

export const getDomain = moize((fieldDef: ResolvedFieldDef, data: UmweltDataset, derive?: boolean): UmweltValue[] => {
  // TODO account for domain overrides in the field def

  const field = derive ? derivedFieldName(fieldDef) : fieldDef.field;

  const uniqueVals = new Map<any, UmweltValue>();

  data.forEach((d) => {
    const value = d[field];

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
