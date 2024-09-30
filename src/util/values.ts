import { isNumeric as vlIsNumeric } from 'vega-lite';
import { TimeUnit, isString } from 'vega';
import { FieldDef, NONE } from '../types';
import moize from 'moize';

export function serializeValue(value: any, fieldDef: FieldDef) {
  if (fieldDef.type === 'temporal') {
    value = datestampToTime(value);
  } else if (isString(value) && isNumeric(value)) {
    value = Number(value);
  }
  return value;
}

export function datestampToTime(datestamp: string | string[]) {
  if (Array.isArray(datestamp)) {
    return datestamp.map((v) => new Date(v).getTime());
  } else {
    return new Date(datestamp).getTime();
  }
}

export function isNumeric(value: string): boolean {
  return vlIsNumeric(value.replaceAll(',', ''));
}

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

export const unwrapNone = (obj: any) => {
  if (obj === NONE) {
    return undefined;
  }
  return obj;
};
