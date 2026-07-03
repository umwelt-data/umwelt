import moize from 'moize';
import { ResolvedFieldDef, UmweltDataset, UmweltValue } from '../types';
import { getDomain as sharedGetDomain } from '@umwelt-data/umwelt-utils/data';
import { derivedFieldName, derivedFieldNameBinStartEnd } from './transforms';

export const getDomain = moize((fieldDef: ResolvedFieldDef, data: UmweltDataset, derive?: boolean): UmweltValue[] => {
  const field = derive ? derivedFieldName(fieldDef) : fieldDef.field;
  return sharedGetDomain({ field, type: fieldDef.type, timeUnit: fieldDef.timeUnit }, data);
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
