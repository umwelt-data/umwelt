import { serializeValue } from '@umwelt-data/umwelt-utils/data';
import { FieldDef } from '../types';

export function filterObjectByKeys(object: { [s: string]: any }, keys: string[]) {
  return Object.fromEntries(Object.entries(object).filter(([key, _]) => keys.includes(key)));
}

export function rangesAreEqual(range1: any[], range2: any[], fieldDef: FieldDef) {
  if (range1 && range2 && Array.isArray(range1) && Array.isArray(range2)) {
    return serializeValue(range1[0], fieldDef) === serializeValue(range2[0], fieldDef) && serializeValue(range1[1], fieldDef) === serializeValue(range2[1], fieldDef);
  }
  return false;
}

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);
