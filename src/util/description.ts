import moize from 'moize';
import { AudioTraversalFieldDef, EncodingFieldDef, FieldDef, NONE } from '../types';

export const dateToTimeUnit = moize((date: Date, timeUnit: string) => {
  if (!timeUnit) {
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  const opts: Intl.DateTimeFormatOptions = {};
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

export const describeField = moize((fieldDef: FieldDef, encFieldDef?: EncodingFieldDef | AudioTraversalFieldDef): string => {
  const inheritedFieldDef = encFieldDef ? { ...fieldDef, ...encFieldDef } : { field: fieldDef.name, ...fieldDef };
  return (inheritedFieldDef.bin ? 'binned ' : '') + (inheritedFieldDef.aggregate && inheritedFieldDef.aggregate !== NONE ? `${inheritedFieldDef.aggregate} ` : '') + inheritedFieldDef.field + (inheritedFieldDef.timeUnit && inheritedFieldDef.timeUnit !== NONE ? ` (${inheritedFieldDef.timeUnit})` : '');
});
