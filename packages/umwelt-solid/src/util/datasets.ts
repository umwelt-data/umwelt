import { ExportableUmweltDataSource, FieldDef, UmweltDataset, UmweltTransform, UmweltValue, isExportableUmweltURLDataSource, isExportableUmweltValuesDataSource } from '../types';
import { typeCoerceData as sharedTypeCoerceData, fetchAndParse } from '@umwelt-data/umwelt-utils/data';
import { applyTransforms } from './transforms';
import moize from 'moize';

export const DEFAULT_DATASET_NAME = 'dataset';

export const VEGA_DATA_URL_PREFIX = 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/';

// Built-in example datasets. Exportable specs may reference these by name alone;
// resolveDataSource looks the name up here.
export const EXAMPLE_DATASETS: Record<string, string> = Object.fromEntries(
  ['stocks.csv', 'cars.json', 'weather.csv', 'seattle-weather.csv', 'penguins.json', 'driving.json', 'barley.json', 'disasters.csv', 'gapminder.json'].map((filename) => [filename, `${VEGA_DATA_URL_PREFIX}${filename}`])
);

export interface ResolvedDataSource {
  name: string;
  data: UmweltDataset;
  sourceUrl?: string;
}

// Resolves an exportable data source to its data, in priority order:
// embedded values > url > example dataset name.
export async function resolveDataSource(source: ExportableUmweltDataSource): Promise<ResolvedDataSource | undefined> {
  if (isExportableUmweltValuesDataSource(source)) {
    const name = source.name || DEFAULT_DATASET_NAME;
    return source.values.length ? { name, data: source.values } : undefined;
  }
  if (isExportableUmweltURLDataSource(source)) {
    const name = source.name || source.url.split('/').pop() || DEFAULT_DATASET_NAME;
    const data = await getData(source.url);
    return data.length ? { name, data, sourceUrl: source.url } : undefined;
  }
  if (source.name) {
    const url = EXAMPLE_DATASETS[source.name];
    if (!url) {
      console.error(`Unknown example dataset "${source.name}". A name-only data source must reference a built-in example dataset, or provide a url or values.`);
      return undefined;
    }
    const data = await getData(url);
    return data.length ? { name: source.name, data, sourceUrl: url } : undefined;
  }
  return undefined;
}

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
