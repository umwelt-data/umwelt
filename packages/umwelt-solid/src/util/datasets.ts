import { compile } from 'vega-lite';
import { FieldDef, UmweltDataset, UmweltTransform, UmweltValue, VlSpec } from '../types';
import { typeCoerceData as sharedTypeCoerceData, fetchAndParse } from '@umwelt-data/umwelt-utils/data';
import { evaluateVegaData, extractOutputDatasets, type VegaDataEntry } from '@umwelt-data/umwelt-utils/vega';
import moize from 'moize';
import cloneDeep from 'lodash.clonedeep';

export const DEFAULT_DATASET_NAME = 'dataset';

export const getData = moize.promise(async (url: string): Promise<UmweltDataset> => {
  try {
    const parsed = await fetchAndParse(url);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`Failed to load data from ${url} \n ${error}`);
    return [];
  }
});

export const getTransformedData = moize.promise(async (data: UmweltDataset, transforms: UmweltTransform[]): Promise<UmweltDataset> => {
  const vlSpec: VlSpec = cloneDeep({
    data: { values: data },
    transform: transforms,
    mark: 'point',
  });

  try {
    const vgSpec = compile(vlSpec as any).spec;
    const dataEntries = (vgSpec.data ?? []) as VegaDataEntry[];
    const store = evaluateVegaData(dataEntries);
    const datasets = extractOutputDatasets(dataEntries, store);
    // the last output dataset is the furthest through the transform pipeline
    return (datasets[datasets.length - 1] ?? []) as UmweltDataset;
  } catch (error) {
    console.warn(`Failed to evaluate transforms \n ${error}`);
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
