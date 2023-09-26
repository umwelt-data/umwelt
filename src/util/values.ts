import { isNumeric as vlIsNumeric } from 'vega-lite';
import { TimeUnit, isString } from 'vega';
import { EncodingFieldDef, FieldDef, UmweltValue } from '../types';
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

export const dateToTimeUnit = moize((date: Date, timeUnit: TimeUnit) => {
  if (!timeUnit) {
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  const opts: { [s: string]: string } = {};
  if (timeUnit.includes('year')) {
    opts['year'] = 'numeric';
  }
  if (timeUnit.includes('month')) {
    opts['month'] = 'short';
  }
  if (timeUnit.includes('day')) {
    opts['weekday'] = 'short';
  }
  if (timeUnit.includes('date')) {
    opts['day'] = 'numeric';
  }
  if (timeUnit.includes('hours')) {
    opts['hour'] = 'numeric';
  }
  if (timeUnit.includes('minutes')) {
    opts['minute'] = 'numeric';
  }
  if (timeUnit.includes('seconds')) {
    opts['second'] = 'numeric';
  }
  if (!Object.keys(opts).length) {
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return date.toLocaleString('en-US', opts);
});

export const fmtValue = moize((value, fieldDef): string => {
  if (Array.isArray(value)) {
    return value.map((v) => fmtValue(v, fieldDef)).join(', ');
  }
  if (fieldDef.type === 'temporal' && !(value instanceof Date)) {
    value = new Date(value);
  }
  if (value instanceof Date) {
    return dateToTimeUnit(value, fieldDef.timeUnit);
  } else if (typeof value !== 'string' && !isNaN(value) && value % 1 != 0) {
    return Number(value).toFixed(2);
  }
  return String(value);
});

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);
