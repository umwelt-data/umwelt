import moize from 'moize';
import { ResolvedFieldDef, UmweltDataset, UmweltPredicate, UmweltValue } from '../types';
import { selectionTest } from './selection';
import { dateToFormattedString } from './description';
import { binnedFieldNames, derivedFieldName, derivedFieldNameBinStartEnd } from './transforms';

export const getDomain = moize((fieldDef: ResolvedFieldDef, data: UmweltDataset, derive?: boolean): UmweltValue[] => {
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

export const getBinnedDomain = moize((fieldDef: ResolvedFieldDef, data: UmweltDataset): [UmweltValue, UmweltValue][] => {
  if (fieldDef.bin) {
    // For binned fields, create pairs of [start, end] values
    const startEndNames = derivedFieldNameBinStartEnd(fieldDef);
    return data
      .map((d) => {
        const start = d[startEndNames[0]];
        const end = d[startEndNames[1]];
        return [start, end];
      })
      .sort((a, b) => {
        if (typeof a[0] === 'number' && typeof b[0] === 'number') {
          return a[0] - b[0];
        }
        if (a[0] instanceof Date && b[0] instanceof Date) {
          return a[0].getTime() - b[0].getTime();
        }
        if (typeof a[0] === 'string' && typeof b[0] === 'string') {
          return a[0].localeCompare(b[0]);
        }
        return 0; // Keep original order for unsupported types
      }) as [UmweltValue, UmweltValue][];
  }
  return [];
});
