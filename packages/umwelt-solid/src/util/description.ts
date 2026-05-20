import { ResolvedFieldDef } from '../types';
import {
  fmtValue,
  makeCommaSeparatedString,
} from '@umwelt-data/umwelt-utils/description';

export const fmtCompoundValue = (value: any, fieldDef: ResolvedFieldDef): string => {
  if (Array.isArray(value)) {
    if (value.length === 2 && (fieldDef.type === 'quantitative' || fieldDef.type === 'temporal')) {
      return value.map((v) => fmtCompoundValue(v, fieldDef)).join('–');
    }
    return makeCommaSeparatedString(value.map((v) => fmtCompoundValue(v, fieldDef)));
  }
  return fmtValue(value, fieldDef);
};
