import { test, expect } from 'vitest';
import { compressedSpec, decodeSpecFromString, elaborateExportableSpec, exportableSpec } from '../../src/util/spec';
import { EXAMPLE_DATASETS, resolveDataSource, typeCoerceData } from '../../src/util/datasets';
import { UmweltSpec, isExportableUmweltValuesDataSource } from '../../src/types';
import { UmweltDatastore } from '../../src/contexts/UmweltDatastoreContext';

const makeSpec = (dataName: string): UmweltSpec => ({
  data: { name: dataName },
  fields: [
    { active: true, name: 'date', type: 'temporal', encodings: [{ unit: 'unit0', property: 'x' }] },
    {
      active: true,
      name: 'sales',
      type: 'quantitative',
      encodings: [
        { unit: 'unit0', property: 'y' },
        { unit: 'audio0', property: 'pitch' },
      ],
    },
    { active: false, name: 'notes', type: 'nominal', encodings: [] },
  ],
  key: ['date'],
  visual: {
    composition: 'layer',
    units: [{ name: 'unit0', mark: 'line', encoding: { x: { field: 'date' }, y: { field: 'sales' } } }],
  },
  audio: {
    composition: 'concat',
    units: [{ name: 'audio0', encoding: { pitch: { field: 'sales' } }, traversal: [{ field: 'date' }] }],
  },
});

const sampleData = [
  { date: new Date('2023-01-01'), sales: 125, notes: 'a' },
  { date: new Date('2023-02-01'), sales: 89, notes: 'b' },
];

test('exportable spec round-trips through elaboration', () => {
  const spec = makeSpec('mydata.json');
  const datastore: UmweltDatastore = { 'mydata.json': { data: sampleData } };

  const exported = exportableSpec(spec, datastore);
  // inactive fields are dropped, active/encodings stripped
  expect(exported.fields.map((f) => f.name)).toEqual(['date', 'sales']);
  expect(exported.fields.every((f) => !('active' in f) && !('encodings' in f))).toBe(true);

  const elaborated = elaborateExportableSpec(exported);
  const activeFields = spec.fields.filter((f) => f.active);
  expect(elaborated.fields).toEqual(activeFields);
  expect(elaborated.key).toEqual(spec.key);
  expect(elaborated.visual).toEqual(spec.visual);
  expect(elaborated.audio).toEqual(spec.audio);
  expect(elaborated.data).toEqual(spec.data);
});

test('data key serializes last so embedded values do not bury the spec', () => {
  const spec = makeSpec('mydata.json');
  const exported = exportableSpec(spec, { 'mydata.json': { data: sampleData } });
  expect(Object.keys(exported).pop()).toEqual('data');
});

test('example datasets export as name-only sources', () => {
  const spec = makeSpec('stocks.csv');
  const datastore: UmweltDatastore = { 'stocks.csv': { data: sampleData, sourceUrl: EXAMPLE_DATASETS['stocks.csv'] } };
  expect(exportableSpec(spec, datastore).data).toEqual({ name: 'stocks.csv' });
});

test('datasets with a source url export as url sources', () => {
  const spec = makeSpec('remote.json');
  const datastore: UmweltDatastore = { 'remote.json': { data: sampleData, sourceUrl: 'https://example.com/remote.json' } };
  expect(exportableSpec(spec, datastore).data).toEqual({ name: 'remote.json', url: 'https://example.com/remote.json' });
});

test('uploaded datasets export with embedded values', () => {
  const spec = makeSpec('upload.json');
  const datastore: UmweltDatastore = { 'upload.json': { data: sampleData } };
  const exported = exportableSpec(spec, datastore);
  expect(exported.data).toEqual({ name: 'upload.json', values: sampleData });
});

test('resolveDataSource uses embedded values without fetching', async () => {
  const resolved = await resolveDataSource({ name: 'upload.json', values: sampleData });
  expect(resolved).toEqual({ name: 'upload.json', data: sampleData });
});

test('resolveDataSource rejects empty values and unknown example names', async () => {
  expect(await resolveDataSource({ name: 'upload.json', values: [] })).toBeUndefined();
  expect(await resolveDataSource({ name: 'not-a-real-example.csv' })).toBeUndefined();
});

test('compressed spec round-trips through URL encoding', () => {
  const spec = makeSpec('upload.json');
  const datastore: UmweltDatastore = { 'upload.json': { data: sampleData } };
  const decoded = decodeSpecFromString(compressedSpec(spec, datastore));
  // JSON transport turns Dates into ISO strings; everything else survives intact
  expect(decoded).toEqual(JSON.parse(JSON.stringify(exportableSpec(spec, datastore))));
});

test('decodeSpecFromString fails cleanly on garbage', () => {
  expect(decodeSpecFromString('not-a-real-spec')).toBeUndefined();
});

test('temporal values survive export, transport, and re-coercion', async () => {
  const spec = makeSpec('upload.json');
  const datastore: UmweltDatastore = { 'upload.json': { data: sampleData } };

  // export with embedded values, then simulate URL transport (Dates become ISO strings)
  const transported = JSON.parse(JSON.stringify(exportableSpec(spec, datastore)));
  expect(isExportableUmweltValuesDataSource(transported.data)).toBe(true);

  const resolved = await resolveDataSource(transported.data);
  expect(resolved).toBeDefined();
  const elaborated = elaborateExportableSpec(transported);
  const coerced = typeCoerceData(resolved!.data, elaborated.fields);
  coerced.forEach((datum, i) => {
    expect(datum.date).toBeInstanceOf(Date);
    expect((datum.date as Date).getTime()).toEqual(sampleData[i].date.getTime());
  });
});
