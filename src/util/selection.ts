import { isDate, toNumber, isArray, inrange } from 'vega';
import { LogicalAnd, LogicalComposition } from 'vega-lite/src/logical';
import { FieldPredicate, FieldEqualPredicate, FieldLTPredicate, FieldGTPredicate, FieldLTEPredicate, FieldGTEPredicate, FieldRangePredicate, FieldOneOfPredicate, FieldValidPredicate } from 'vega-lite/src/predicate';
import { EncodingFieldDef, FieldDef, UmweltDataset, UmweltDatum, UmweltPredicate, UmweltValue } from '../types';
import { fmtValue } from './values';

export type VlSelectionTuple = { unit: string; fields: any; values: any };
export type VlSelectionStore = VlSelectionTuple[];

const TYPE_ENUM = 'E',
  TYPE_RANGE_INC = 'R',
  TYPE_RANGE_EXC = 'R-E',
  TYPE_RANGE_LE = 'R-LE',
  TYPE_RANGE_RE = 'R-RE',
  TYPE_PRED_LT = 'LT',
  TYPE_PRED_LTE = 'LTE',
  TYPE_PRED_GT = 'GT',
  TYPE_PRED_GTE = 'GTE',
  TYPE_PRED_VALID = 'VALID',
  TYPE_PRED_ONE_OF = 'ONE',
  UNIT_INDEX = 'index:unit';

export const predicateToTupleType = (predicate: FieldPredicate) => {
  if ('equal' in predicate) {
    return TYPE_ENUM;
  } else if ('lt' in predicate) {
    return TYPE_PRED_LT;
  } else if ('gt' in predicate) {
    return TYPE_PRED_GT;
  } else if ('lte' in predicate) {
    return TYPE_PRED_LTE;
  } else if ('gte' in predicate) {
    return TYPE_PRED_GTE;
  } else if ('range' in predicate) {
    if ((predicate as any).inclusive) {
      return TYPE_RANGE_INC;
    }
    return TYPE_RANGE_RE;
  } else if ('oneOf' in predicate) {
    return TYPE_PRED_ONE_OF;
  } else if ('valid' in predicate) {
    return TYPE_PRED_VALID;
  }
  return 'E';
};

export const tupleTypeToPredicate = (type: string) => {
  switch (type) {
    case TYPE_ENUM:
      return 'equal';
    case TYPE_PRED_LT:
      return 'lt';
    case TYPE_PRED_GT:
      return 'gt';
    case TYPE_PRED_LTE:
      return 'lte';
    case TYPE_PRED_GTE:
      return 'gte';
    case TYPE_RANGE_INC:
      return 'range';
    case TYPE_PRED_VALID:
      return 'valid';
  }
  return 'equal'; // shrug
};

export function selectionStoreToSelection(store: VlSelectionStore): UmweltPredicate {
  if (store.length) {
    const tuple = store[0];
    const and: FieldPredicate[] = tuple.fields.map((f: any, idx: number) => {
      const predicate = {
        field: f.field,
      };
      const p = tupleTypeToPredicate(f.type);
      (predicate as any)[p] = tuple.values[idx];
      return predicate;
    });
    if (and.length > 1) {
      return {
        and,
      };
    } else {
      return and[0];
    }
  } else {
    return { and: [] };
  }
}

export function predicateToSelectionStore(predicate: LogicalComposition<FieldPredicate>): VlSelectionTuple | undefined {
  if (predicate) {
    const getPredValue = (p: FieldPredicate): UmweltValue | [number, number] => {
      const key = Object.keys(p).find((k) => k !== 'field')!; // find the value key e.g. 'eq', 'lte'
      const value = (p as any)[key];
      return value;
    };
    if ('and' in predicate) {
      const and = predicate.and;
      const stores = and.map((p) => predicateToSelectionStore(p));
      const tuple_fields = stores.flatMap((store) => {
        return store?.fields || [];
      });
      const tuple_values = stores.flatMap((store) => {
        return store?.values || [];
      });
      return {
        unit: '',
        fields: tuple_fields,
        values: tuple_values,
      };
    } else if ('or' in predicate) {
      const or = predicate.or;
      // TODO this would likely require changes to vega.
    } else if ('not' in predicate) {
      const not = predicate.not;
      // TODO same as above
    } else {
      // predicate is FieldPredicate
      const tuple_fields = [
        {
          type: predicateToTupleType(predicate),
          field: predicate.field,
        },
      ];
      const tuple_values = [getPredValue(predicate)];
      if (!tuple_fields.length && !tuple_values.length) {
        return undefined;
      }
      return {
        unit: '',
        fields: tuple_fields,
        values: tuple_values,
      };
    }
  }
  return undefined;
}

export function selectionTest(data: UmweltDataset, predicate: UmweltPredicate): UmweltDataset {
  try {
    const store = predicateToSelectionStore(predicate);
    if (!store) return data;
    return data.filter((datum) => {
      return testPoint(datum, store);
    });
  } catch (e) {
    console.error(e);
    return data;
  }
}

function testPoint(datum: { [x: string]: any }, entry: { fields: any; values: any }) {
  var fields = entry.fields,
    values = entry.values,
    dval;

  return fields.every((f: any, i: number) => {
    dval = datum[f.field];

    if (isDate(dval)) dval = toNumber(dval);
    if (isDate(values[i])) values[i] = toNumber(values[i]);
    if (isDate(values[i][0])) values[i] = values[i].map(toNumber);

    switch (f.type) {
      case TYPE_ENUM:
        // Enumerated fields can either specify individual values (single/multi selections)
        // or an array of values (interval selections).
        return !(isArray(values[i]) ? values[i].indexOf(dval) < 0 : dval !== values[i]);
      case TYPE_RANGE_INC:
        return inrange(dval, values[i], true, true);
      case TYPE_RANGE_RE:
        // Discrete selection of bins test within the range [bin_start, bin_end).
        return inrange(dval, values[i], true, false);
      case TYPE_RANGE_EXC: // 'R-E'/'R-LE' included for completeness.
        return inrange(dval, values[i], false, false);
      case TYPE_RANGE_LE:
        return inrange(dval, values[i], false, true);
      case TYPE_PRED_LT:
        return dval < values[i];
      case TYPE_PRED_GT:
        return dval > values[i];
      case TYPE_PRED_LTE:
        return dval <= values[i];
      case TYPE_PRED_GTE:
        return dval >= values[i];
      case TYPE_PRED_VALID:
        return !(dval === null || isNaN(dval));
      default:
        return true;
    }
  });
}

export function datumToPredicate(datum: UmweltDatum, fields: (FieldDef | EncodingFieldDef)[]): LogicalAnd<FieldEqualPredicate> {
  const fieldNames = fields.flatMap((f) => {
    if ('field' in f) return [f.field];
    if ('name' in f) return [f.name];
    return [];
  });
  return {
    and: fieldNames.map((field) => {
      return {
        field: field,
        equal: datum[field] as any,
      };
    }),
  };
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

export function predicateToFields(predicate: UmweltPredicate): string[] {
  if ('and' in predicate) {
    return predicate.and.flatMap((p) => predicateToFields(p));
  }
  if ('or' in predicate) {
    return predicate.or.flatMap((p) => predicateToFields(p));
  }
  if ('not' in predicate) {
    return predicateToFields(predicate.not);
  }
  return [predicate.field];
}
