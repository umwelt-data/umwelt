import { compile } from 'vega-lite';
import { FieldDef, MeasureType, UmweltDataset, UmweltDatum, UmweltTransform, UmweltValue, VlSpec } from '../types';
import { getVegaScene } from './vega';
import moize from 'moize';
import { isNumber, isString } from 'vega';
import { isNumeric } from './values';
import cloneDeep from 'lodash.clonedeep';

export const getData = moize.promise(async (url: string): Promise<UmweltDataset> => {
  const vlSpec = {
    data: {
      url,
    },
    mark: 'point',
  };

  const scene = await getVegaScene(compile(vlSpec as any).spec);

  try {
    const datasets = (scene as any).context.data;
    const names = Object.keys(datasets).filter((name) => {
      return name.match(/(source)|(data)_\d/);
    });
    const name = names.reverse()[0]; // TODO do we know this is the right one?
    const dataset = datasets[name].values.value;

    return dataset;
  } catch (error) {
    console.warn(`No data found in the Vega scenegraph \n ${error}`);
    return [];
  }
});

export const getTransformedData = moize.promise(async (data: UmweltDataset, transforms: UmweltTransform[]): Promise<UmweltDataset> => {
  const vlSpec: VlSpec = cloneDeep({
    data: { values: data },
    transform: transforms,
    mark: 'point',
  });

  const scene = await getVegaScene(compile(vlSpec as any).spec);

  try {
    const datasets = (scene as any).context.data;
    const names = Object.keys(datasets).filter((name) => {
      return name.match(/(source)|(data)_\d/);
    });
    const name = names.reverse()[0]; // TODO do we know this is the right one?
    const dataset = datasets[name].values.value;
    return dataset;
  } catch (error) {
    console.warn(`No data found in the Vega scenegraph \n ${error}`);
    return [];
  }
});

export function typeCoerceData(data: UmweltDataset, fields: FieldDef[]): UmweltDataset {
  // convert temporal fields into date objects converts quantitative into numbers
  const lookup = Object.fromEntries(fields.map((f) => [f.name, f.type]));

  if (data.length === 0) return data;
  if (JSON.stringify(typeCoerceDatum(lookup, data[0])) === JSON.stringify(data[0])) return data; // no type coercion needed

  return data.map((datum) => {
    return typeCoerceDatum(lookup, datum);
  });
}

function typeCoerceDatum(lookup: { [x: string]: MeasureType | undefined }, datum: UmweltDatum): UmweltDatum {
  return Object.fromEntries(
    Object.entries(datum).map(([field, value]: [string, UmweltValue]) => {
      if (!lookup[field]) return [field, value];
      if (value === null || value === undefined) return [field, value];
      switch (lookup[field]) {
        case 'temporal':
          if (field.toLowerCase() === 'year') {
            if (isNumber(value) || (isString(value) && isNumeric(String(value)))) {
              return [field, new Date(Number(value), 0, 1)];
            } else if (isString(value)) {
              return [field, new Date(value)];
            }
          }
          return [field, new Date(value)];
        case 'quantitative':
          if (value instanceof Date) {
            return [field, value.getTime()];
          }
          if (isString(value) && isNumeric(String(value))) {
            return [field, Number(value)];
          }
      }
      return [field, value];
    })
  );
}

// TODO: future support for null/undefined values in data?
export function cleanData(data: UmweltDataset, fields: FieldDef[]): UmweltDataset {
  // remove rows with null or undefined values
  return data.filter((datum) => {
    return Object.entries(datum).every(([field, value]: [string, UmweltValue]) => {
      if (fields.find((f) => f.name === field)) {
        return value !== null && value !== undefined;
      }
      return true;
    });
  });
}
