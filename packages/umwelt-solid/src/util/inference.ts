import { FieldDef, MeasureType, UmweltDataset, UmweltDatum } from '../types';
import { typeInference } from '@umwelt-data/umwelt-utils/data';
import { getTransformedData } from './datasets';
import { fieldsToTransforms } from './transforms';
import { resolveFieldDef } from './spec';

export function elaborateFields(fields: FieldDef[], data: UmweltDataset): FieldDef[] {
  return fields.map((fieldDef) => {
    const spec: FieldDef = {
      active: true,
      name: fieldDef.name,
      type: fieldDef.type || typeInference(data, fieldDef.name),
      scale: fieldDef.scale,
      encodings: fieldDef.encodings || [],
    };
    if (!fieldDef.type && spec.name.toLowerCase() === 'year') {
      const yearType = yearFieldType(data, spec.name);
      if (yearType) {
        spec.type = yearType;
      }
    }
    if (spec.type === 'temporal' && spec.name.toLowerCase() === 'year') {
      spec.timeUnit = 'year';
    }
    return spec;
  });
}

// Columns named "year" holding integers (e.g. 2001) infer as quantitative,
// but reading them as time is almost always right: temporal, or ordinal when
// there are only a handful of distinct years.
function yearFieldType(data: UmweltDataset, field: string): MeasureType | undefined {
  const values = data.map((d) => d[field]).filter((v) => v !== null && v !== undefined);
  if (!values.length) return undefined;
  const allIntegers = values.every((v) => !(v instanceof Date) && Number.isInteger(Number(v)));
  if (!allIntegers) return undefined;
  const distinct = new Set(values).size;
  return distinct <= 5 ? 'ordinal' : 'temporal';
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

  const transforms = fieldsToTransforms(fields.map((fieldDef) => resolveFieldDef(fieldDef)));
  const transformedData = await getTransformedData(data, transforms);

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
