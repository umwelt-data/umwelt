import { test, expect } from 'vitest';
import { compressedSpec, decodeSpecFromString, elaborateExportableSpec, exportableSpec, resolveAudioUnitFields, seedChartOverride, umweltToOlliSpec } from '../../src/util/spec';
import { EXAMPLE_DATASETS, resolveDataSource, typeCoerceData } from '../../src/util/datasets';
import { UmweltSpec, TextNode, VisualUnitSpec, FieldDef, DATA_STRUCTURE_KEY, isExportableUmweltValuesDataSource, isExportableVisualSpec } from '../../src/types';
import { UmweltDatastore } from '../../src/contexts/UmweltDatastoreContext';
import { isMultiSpec } from 'olli';

const makeSpec = (dataName: string): UmweltSpec => ({
  data: { name: dataName },
  fields: [
    { active: true, name: 'date', type: 'temporal', encodings: [{ unit: 'vis_unit_0', property: 'x' }] },
    {
      active: true,
      name: 'sales',
      type: 'quantitative',
      encodings: [
        { unit: 'vis_unit_0', property: 'y' },
        { unit: 'audio_unit_0', property: 'pitch' },
      ],
    },
    { active: false, name: 'notes', type: 'nominal', encodings: [] },
  ],
  key: ['date'],
  visual: {
    composition: 'layer',
    units: [{ name: 'vis_unit_0', mark: 'line', encoding: { x: { field: 'date' }, y: { field: 'sales' } } }],
  },
  audio: {
    composition: 'concat',
    units: [{ name: 'audio_unit_0', encoding: { pitch: { field: 'sales' } }, traversal: [{ field: 'date' }] }],
  },
  text: { structures: {} },
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

test('a single-unit modality exports as the bare unit and is re-wrapped on elaboration', () => {
  const spec = makeSpec('mydata.json');
  const datastore: UmweltDatastore = { 'mydata.json': { data: sampleData } };

  const exported = exportableSpec(spec, datastore);
  // the lone unit is hoisted to the top level (no units[] array, no composition)
  expect('units' in exported.visual).toBe(false);
  expect('units' in exported.audio).toBe(false);
  // a lone unit's name is redundant, so it is dropped and reconstructed on import
  expect('name' in exported.visual).toBe(false);
  expect('name' in exported.audio).toBe(false);
  const { name: _vn, ...visualNoName } = spec.visual.units[0];
  const { name: _an, ...audioNoName } = spec.audio.units[0];
  expect(exported.visual).toEqual(visualNoName);
  expect(exported.audio).toEqual(audioNoName);
  const elaborated = elaborateExportableSpec(exported);
  expect(elaborated.visual).toEqual(spec.visual);
  expect(elaborated.audio).toEqual(spec.audio);

  // multi-unit modalities keep their composition
  const multiUnit: UmweltSpec = {
    ...spec,
    visual: {
      composition: 'concat',
      units: [
        { name: 'unit0', mark: 'line', encoding: { x: { field: 'date' }, y: { field: 'sales' } } },
        { name: 'unit1', mark: 'point', encoding: { x: { field: 'date' }, y: { field: 'sales' } } },
      ],
    },
  };
  const exportedMulti = exportableSpec(multiUnit, datastore).visual;
  expect(isExportableVisualSpec(exportedMulti) && exportedMulti.composition).toEqual('concat');
});

test('multi-unit names are dropped when default and kept when custom, round-tripping either way', () => {
  const datastore: UmweltDatastore = { 'mydata.json': { data: sampleData } };
  const spec: UmweltSpec = {
    ...makeSpec('mydata.json'),
    visual: {
      composition: 'concat',
      units: [
        // index 0 carries its default name → dropped; a renamed unit → kept
        { name: 'vis_unit_0', mark: 'line', encoding: { x: { field: 'date' }, y: { field: 'sales' } } },
        { name: 'my_view', mark: 'point', encoding: { x: { field: 'date' }, y: { field: 'sales' } } },
      ],
    },
  };
  const exported = exportableSpec(spec, datastore);
  const units = isExportableVisualSpec(exported.visual) ? exported.visual.units : [];
  expect('name' in units[0]).toBe(false);
  expect(units[1].name).toBe('my_view');

  // reconstructs the dropped default name from its index, keeps the custom one
  const elaborated = elaborateExportableSpec(exported);
  expect(elaborated.visual.units.map((u) => u.name)).toEqual(['vis_unit_0', 'my_view']);
});

test('a custom lone-unit name is retained so it survives adding a second unit later', () => {
  const datastore: UmweltDatastore = { 'mydata.json': { data: sampleData } };
  const spec: UmweltSpec = {
    ...makeSpec('mydata.json'),
    visual: { composition: 'layer', units: [{ name: 'custom', mark: 'line', encoding: { x: { field: 'date' } } }] },
    text: { structures: { custom: textStructure } },
  };
  const exported = exportableSpec(spec, datastore);
  // a non-default name is kept even on a lone (unwrapped) unit
  expect((exported.visual as any).name).toBe('custom');
  expect(Object.keys(exported.text!.structures)).toEqual(['custom']);

  const elaborated = elaborateExportableSpec(exported);
  expect(elaborated.visual.units[0].name).toBe('custom');
  expect(elaborated.text.structures.custom).toBeDefined();
});

test('data key serializes last so embedded values do not bury the spec', () => {
  const spec = makeSpec('mydata.json');
  const exported = exportableSpec(spec, { 'mydata.json': { data: sampleData } });
  expect(Object.keys(exported).pop()).toEqual('data');
});

// --- text modality ---------------------------------------------------------

const textStructure: TextNode[] = [
  {
    id: 'n0',
    nodeType: 'group',
    groupby: [{ field: 'date' }],
    children: [{ id: 'n1', nodeType: 'predicate', predicate: { and: [{ field: 'sales', gte: 100 }] }, name: 'strong months', children: [] }],
  },
];

test('empty text is not serialized; authored text is', () => {
  const datastore: UmweltDatastore = { 'mydata.json': { data: sampleData } };
  const empty = makeSpec('mydata.json');
  expect('text' in exportableSpec(empty, datastore)).toBe(false);

  const authored: UmweltSpec = { ...empty, text: { structures: { [DATA_STRUCTURE_KEY]: textStructure } } };
  const exported = exportableSpec(authored, datastore);
  expect(exported.text?.structures[DATA_STRUCTURE_KEY]).toEqual(textStructure);
});

test('authored text round-trips through elaboration with regenerated node ids', () => {
  const datastore: UmweltDatastore = { 'mydata.json': { data: sampleData } };
  const authored: UmweltSpec = { ...makeSpec('mydata.json'), text: { structures: { vis_unit_0: textStructure } } };

  const elaborated = elaborateExportableSpec(exportableSpec(authored, datastore));
  const outStructure = elaborated.text.structures.vis_unit_0;
  // shape preserved
  expect(outStructure[0].nodeType).toBe('group');
  expect(outStructure[0].children[0].nodeType).toBe('predicate');
  // ids regenerated (not the serialized 'n0'/'n1') so they can't collide with fresh ids
  expect(outStructure[0].id).not.toBe('n0');
  expect(outStructure[0].children[0].id).not.toBe('n1');
});

test('same field grouped two ways lowers to distinct derived columns', async () => {
  // group `sales` (base type quantitative) as-is in one branch and as ordinal in
  // another. olli resolves field defs by name, so the divergent branch must get a
  // derived column with its own field def rather than collide on `sales`.
  const structure: TextNode[] = [
    { id: 'a', nodeType: 'group', groupby: [{ field: 'sales' }], children: [] },
    { id: 'b', nodeType: 'group', groupby: [{ field: 'sales', type: 'ordinal' }], children: [] },
  ];
  const spec: UmweltSpec = {
    ...makeSpec('mydata.json'),
    visual: { units: [], composition: 'layer' }, // no viz → the data structure is the whole spec
    text: { structures: { [DATA_STRUCTURE_KEY]: structure } },
  };
  const olli = await umweltToOlliSpec(spec, sampleData);
  const unit = isMultiSpec(olli) ? olli.units[0] : olli;
  const roots = unit.structure as any[];
  // primary (base-matching) keeps the real name; the ordinal override is derived
  expect(roots[0].groupby).toBe('sales');
  expect(roots[1].groupby).toBe('sales__ordinal');
  // derived field def carries the override type + a label back to the real field
  const derived = unit.fields?.find((f) => f.field === 'sales__ordinal');
  expect(derived).toMatchObject({ type: 'ordinal', label: 'sales' });
  // and the data gained the derived column (a copy of the raw field)
  expect(sampleData.every((d, i) => (unit.data as any[])[i]['sales__ordinal'] === d.sales)).toBe(true);
});

test('authored data structure with no visualization lowers to a plain unit', async () => {
  const spec: UmweltSpec = {
    ...makeSpec('mydata.json'),
    visual: { units: [], composition: 'layer' }, // no visual → single bare unit
    text: { structures: { [DATA_STRUCTURE_KEY]: textStructure } },
  };
  const olli = await umweltToOlliSpec(spec, sampleData);
  const unit = isMultiSpec(olli) ? olli.units[0] : olli;
  // plain unit: no chart context (no mark/axes)
  expect(unit.mark).toBeUndefined();
  // group node → olli groupby; nested predicate node → olli predicate node
  const root = Array.isArray(unit.structure) ? unit.structure[0] : unit.structure;
  expect(root).toMatchObject({ groupby: 'date' });
  expect((root as any).children[0]).toMatchObject({ predicate: { and: [{ field: 'sales', gte: 100 }] }, name: 'strong months' });
});

test("an authored chart-view structure overrides that view's tree but keeps chart context", async () => {
  // makeSpec's single visual unit is named 'vis_unit_0' and is a line chart
  const spec: UmweltSpec = { ...makeSpec('mydata.json'), text: { structures: { vis_unit_0: textStructure } } };
  const olli = await umweltToOlliSpec(spec, sampleData);
  const unit = isMultiSpec(olli) ? olli.units[0] : olli;
  // authored structure applied...
  const root = Array.isArray(unit.structure) ? unit.structure[0] : unit.structure;
  expect(root).toMatchObject({ groupby: 'date' });
  // ...while the view keeps its chart context (still a line chart, chart-framed)
  expect(unit.mark).toBe('line');
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

test('resolveAudioUnitFields resolves per usage and excludes unused fields', () => {
  const spec = makeSpec('mydata.json');
  spec.fields.push({ active: true, name: 'region', type: 'nominal', encodings: [] });

  // same field encoded (count) and traversed (binned) — both resolutions must
  // survive so the bin lands in the groupby while the count aggregates
  const unit = {
    name: 'audio0',
    encoding: { volume: { field: 'sales', aggregate: 'count' as const } },
    traversal: [{ field: 'sales', bin: true }],
  };

  const resolved = resolveAudioUnitFields(spec, unit);

  expect(resolved).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ field: 'sales', aggregate: 'count' }),
      expect.objectContaining({ field: 'sales', bin: true }),
    ])
  );
  // 'date', 'notes', and 'region' are not referenced by the unit
  expect(resolved).toHaveLength(2);
});

// --- seedChartOverride: parity with olli's inferStructure -------------------

// Reduce a seed to the field-grouping shape it encodes, dropping the editor ids
// so tests read the structure olli inferred, not the id-assignment mechanics.
type SeedShape = { groupby: string[]; children: SeedShape[] };
function shapeOf(nodes: TextNode[]): SeedShape[] {
  return nodes.map((n) => ({
    groupby: n.nodeType === 'group' ? n.groupby.map((r) => r.field) : [],
    children: shapeOf(n.children),
  }));
}

const field = (name: string, type: FieldDef['type']): FieldDef => ({ active: true, name, type, encodings: [] });

const seedSpec = (fields: FieldDef[], unit: VisualUnitSpec): UmweltSpec => ({
  data: { name: 'd.json' },
  fields,
  key: [],
  visual: { composition: 'layer', units: [unit] },
  audio: { composition: 'concat', units: [] },
  text: { structures: {} },
});

test('seedChartOverride groups a scatterplot by both quantitative axes', () => {
  const spec = seedSpec(
    [field('mpg', 'quantitative'), field('hp', 'quantitative')],
    { name: 'u', mark: 'point', encoding: { x: { field: 'mpg' }, y: { field: 'hp' } } }
  );
  // scatterplots were the case the old hand-rolled replica once seeded empty
  expect(shapeOf(seedChartOverride(spec.visual.units[0], spec))).toEqual([
    { groupby: ['mpg'], children: [] },
    { groupby: ['hp'], children: [] },
  ]);
});

test('seedChartOverride drops the unbinned quantitative measure axis for a bar chart', () => {
  const spec = seedSpec(
    [field('category', 'nominal'), field('amount', 'quantitative')],
    { name: 'u', mark: 'bar', encoding: { x: { field: 'category' }, y: { field: 'amount' } } }
  );
  expect(shapeOf(seedChartOverride(spec.visual.units[0], spec))).toEqual([{ groupby: ['category'], children: [] }]);
});

test('seedChartOverride nests a facet over its guides', () => {
  const spec = seedSpec(
    [field('region', 'nominal'), field('a', 'quantitative'), field('b', 'quantitative')],
    { name: 'u', mark: 'point', encoding: { facet: { field: 'region' }, x: { field: 'a' }, y: { field: 'b' } } }
  );
  expect(shapeOf(seedChartOverride(spec.visual.units[0], spec))).toEqual([
    {
      groupby: ['region'],
      children: [
        { groupby: ['a'], children: [] },
        { groupby: ['b'], children: [] },
      ],
    },
  ]);
});

test('seedChartOverride nests a multi-series line under its color series', () => {
  const spec = seedSpec(
    [field('date', 'temporal'), field('price', 'quantitative'), field('symbol', 'nominal')],
    { name: 'u', mark: 'line', encoding: { x: { field: 'date' }, y: { field: 'price' }, color: { field: 'symbol' } } }
  );
  expect(shapeOf(seedChartOverride(spec.visual.units[0], spec))).toEqual([
    {
      groupby: ['symbol'],
      children: [
        { groupby: ['date'], children: [] },
        { groupby: ['price'], children: [] },
      ],
    },
  ]);
});
