import moize from 'moize';
import { AudioTraversalFieldDef, EncodingFieldDef, FieldDef, UmweltValue } from '../types';
import { dateToTimeUnit } from './values';
import { LogicalComposition } from 'vega-lite/src/logical';
import { FieldPredicate } from 'vega-lite/src/predicate';

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

function fieldPredicateToDescription(predicate: FieldPredicate, fields: FieldDef[]) {
  const fieldDef = fields.find((f) => f.name === predicate.field);
  if (!fieldDef) return '';
  const field = fieldDef.name;
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

export function predicateToDescription(predicate: LogicalComposition<FieldPredicate>, fields: FieldDef[]): string {
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

export const describeField = moize((fieldDef: FieldDef, encFieldDef?: EncodingFieldDef | AudioTraversalFieldDef): string => {
  const inheritedFieldDef = encFieldDef ? { ...fieldDef, ...encFieldDef } : { field: fieldDef.name, ...fieldDef };
  return (inheritedFieldDef.bin ? 'binned ' : '') + (inheritedFieldDef.aggregate ? `${inheritedFieldDef.aggregate} ` : '') + inheritedFieldDef.field + (inheritedFieldDef.timeUnit ? ` (${inheritedFieldDef.timeUnit})` : '');
});
