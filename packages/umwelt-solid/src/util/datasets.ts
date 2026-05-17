import { compile } from 'vega-lite';
import { FieldDef, UmweltDataset, UmweltTransform, UmweltValue, VlSpec } from '../types';
import { typeCoerceData as sharedTypeCoerceData } from '@umwelt-data/umwelt-utils/data';
import { getVegaScene } from './vega';
import moize from 'moize';
import cloneDeep from 'lodash.clonedeep';

export const DEFAULT_DATASET_NAME = 'dataset';

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
  const fieldSpecs = fields.map((f) => ({ name: f.name, type: f.type }));
  return sharedTypeCoerceData(data, fieldSpecs) as UmweltDataset;
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
