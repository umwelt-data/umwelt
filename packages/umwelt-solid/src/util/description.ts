import { FieldDef, ResolvedFieldDef, UmweltTimeUnit, UmweltValue } from '../types';
import { LogicalComposition } from 'vega-lite/src/logical';
import { FieldPredicate } from 'vega-lite/src/predicate';

export const fmtValue = (value: any, fieldDef: ResolvedFieldDef): string => {
  if (Array.isArray(value)) {
    if (value.length === 2 && (fieldDef.type === 'quantitative' || fieldDef.type === 'temporal')) {
      return value.map((v) => fmtValue(v, fieldDef)).join('–');
    }
    return makeCommaSeparatedString(value.map((v) => fmtValue(v, fieldDef)));
  }
  if (fieldDef.type === 'temporal' && !(value instanceof Date)) {
    value = new Date(value);
  }
  if (value instanceof Date) {
    return dateToFormattedString(value, fieldDef.timeUnit);
  } else if (typeof value !== 'string' && !isNaN(value) && value % 1 != 0) {
    return Number(value).toFixed(2);
  }
  return String(value);
};

export const dateToFormattedString = (date: Date, timeUnit?: UmweltTimeUnit) => {
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
};

function fieldPredicateToDescription(predicate: FieldPredicate, fields: ResolvedFieldDef[]) {
  const fieldDef = fields.find((f) => f.field === predicate.field);
  if (!fieldDef) return '';
  const field = fieldDef.field;
  if ('equal' in predicate) {
    return `${fmtValue(predicate.equal as UmweltValue, fieldDef)}`;
  }
  if ('range' in predicate && Array.isArray(predicate.range)) {
    return `${field} between ${fmtValue(predicate.range[0], fieldDef)} and ${fmtValue(predicate.range[1], fieldDef)}`;
  }
  if ('lt' in predicate) {
    return `${field} less than ${fmtValue(predicate.lt as UmweltValue, fieldDef)}`;
  }
  if ('lte' in predicate) {
    return `${field} less than or equal to ${fmtValue(predicate.lte as UmweltValue, fieldDef)}`;
  }
  if ('gt' in predicate) {
    return `${field} greater than ${fmtValue(predicate.gt as UmweltValue, fieldDef)}`;
  }
  if ('gte' in predicate) {
    return `${field} greater than or equal to ${fmtValue(predicate.gte as UmweltValue, fieldDef)}`;
  }

  return '';
}

export function predicateToDescription(predicate: LogicalComposition<FieldPredicate>, fields: ResolvedFieldDef[]): string {
  if ('and' in predicate) {
    return predicate.and.map((p) => predicateToDescription(p, fields)).join(' and ');
  }
  if ('or' in predicate) {
    return predicate.or.map((p) => predicateToDescription(p, fields)).join(' or ');
  }
  if ('not' in predicate) {
    return `not ${predicateToDescription(predicate.not, fields)}`;
  }
  return fieldPredicateToDescription(predicate, fields);
}

export const describeField = (resolvedFieldDef: ResolvedFieldDef): string => {
  return `${resolvedFieldDef.bin ? 'binned ' : ''}${resolvedFieldDef.aggregate ?? ''} ${resolvedFieldDef.field}${resolvedFieldDef.timeUnit ? ` (${resolvedFieldDef.timeUnit})` : ''}`.trim();
};

export const makeCommaSeparatedString = (arr: string[]) => {
  const listStart = arr.slice(0, -1).join(', ');
  const listEnd = arr.slice(-1);
  const conjunction = arr.length <= 1 ? '' : arr.length > 2 ? ', and ' : ' and ';

  return [listStart, listEnd].join(conjunction);
};

export function capitalizeFirst(s: string) {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}
