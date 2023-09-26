import dayjs from 'dayjs';
import { FieldDef, MeasureType, UmweltDataset, UmweltDatum } from '../types';
import { getTransformedData } from './datasets';

export function elaborateFields(fields: FieldDef[], data: UmweltDataset): FieldDef[] {
  return fields.map((fieldDef) => {
    const spec: FieldDef = {
      active: true,
      name: fieldDef.name,
      type: fieldDef.type || typeInference(data, fieldDef.name),
      scale: fieldDef.scale,
    };
    if (spec.type === 'temporal' && spec.name.toLowerCase() === 'year') {
      spec.timeUnit = 'year';
    }
    return spec;
  });
}

export function typeInference(data: UmweltDataset, field: string): MeasureType {
  const values = data.map((datum) => datum[field]);

  // this function is mostly stolen from vega/datalib except i fixed the date bug
  function isBoolean(obj: any): obj is boolean {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  }

  function isDate(obj: any): obj is Date {
    return toString.call(obj) === '[object Date]';
  }

  function isValid(obj: any): boolean {
    return obj != null && obj === obj;
  }

  var TESTS = {
    boolean: function (x: any) {
      return x === 'true' || x === 'false' || isBoolean(x);
    },
    integer: function (x: any) {
      return TESTS.number(x) && (x = +x) === ~~x;
    },
    number: function (x: any) {
      return !isNaN(+x) && !isDate(x);
    },
    date: function (x: any) {
      return dayjs(x).isValid();
    },
  };

  // types to test for, in precedence order
  var types = ['boolean' as const, 'integer' as const, 'number' as const, 'date' as const];

  for (let i = 0; i < values.length; ++i) {
    // get next value to test
    const v = values[i];
    // test value against remaining types
    for (let j = 0; j < types.length; ++j) {
      if (isValid(v) && !TESTS[types[j]](v)) {
        types.splice(j, 1);
        j -= 1;
      }
    }
    // if no types left, return 'string'
    if (types.length === 0) break;
  }

  const inference = types.length ? types[0] : 'string';

  switch (inference) {
    case 'boolean':
    case 'string':
      return 'nominal';
    case 'integer':
      const distinct = new Set(values).size;
      if (field.toLowerCase() === 'year') {
        if (distinct <= 5) {
          return 'ordinal';
        }
        return 'temporal';
      }
      // this logic is from compass
      const numberNominalProportion = 0.05;
      const numberNominalLimit = 40;
      if (distinct < numberNominalLimit && distinct / values.length < numberNominalProportion) {
        return 'nominal';
      } else {
        return 'quantitative';
      }
    case 'number':
      return 'quantitative';
    case 'date':
      return 'temporal';
  }
}

export const detectKey = async (fields: FieldDef[], data: UmweltDataset): Promise<string[]> => {
  var combine = function <T>(a: T[], min: number) {
    var fn = function (n: number, src: T[], got: T[], all: T[][]) {
      if (n == 0) {
        if (got.length > 0) {
          all[all.length] = got;
        }
        return;
      }
      for (var j = 0; j < src.length; j++) {
        fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
      }
      return;
    };
    var all: T[][] = [];
    for (var i = min; i < a.length; i++) {
      fn(i, a, [], all);
    }
    all.push(a);
    return all;
  };

  const candidateFields = fields
    .filter((fieldDef) => !fieldDef.aggregate)
    .filter((fieldDef) => {
      if (fieldDef.type === 'quantitative') {
        return fieldDef.bin || fieldDef.timeUnit;
      }
      return true;
    });
  const keyCandidates: FieldDef[][] = combine<FieldDef>(candidateFields, 1);
  const shortestPossibleKeys = [];

  const transformedData = await getTransformedData(data, fields);

  for (let i = 0; i < keyCandidates.length; i++) {
    const keyCandidate = keyCandidates[i];
    if (shortestPossibleKeys.length && keyCandidate.length > shortestPossibleKeys[0].length) {
      break;
    }
    const keyValues = transformedData.map((datum: UmweltDatum) => {
      return keyCandidate
        .map((key) => {
          return datum[key.name];
        })
        .join(',');
    });
    const uniqueKeyValues = new Set(keyValues);
    if (uniqueKeyValues.size === transformedData.length) {
      shortestPossibleKeys.push(keyCandidate);
    }
  }

  if (shortestPossibleKeys.length === 0) {
    return [];
  }
  if (shortestPossibleKeys.length === 1) {
    return shortestPossibleKeys[0].map((fieldDef) => fieldDef.name);
  }

  // multiple key candidates, dont return one to be safe
  return [];
};
