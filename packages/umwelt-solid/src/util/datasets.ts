import { FieldDef, UmweltDataset, UmweltTransform, UmweltValue } from '../types';
import { typeCoerceData as sharedTypeCoerceData, fetchAndParse } from '@umwelt-data/umwelt-utils/data';
import { applyTransforms } from './transforms';
import moize from 'moize';

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
  try {
    return applyTransforms(data, transforms);
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
