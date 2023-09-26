import { compile } from 'vega-lite';
import { FieldDef, UmweltDataset, VlSpec } from '../types';
import { getVegaScene } from './vega';
import moize from 'moize';

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

export const getTransformedData = moize.promise(async (data: UmweltDataset, fields: FieldDef[]): Promise<UmweltDataset> => {
  const vlSpec: VlSpec = {
    data: { values: data },
    transform: [],
    mark: 'point',
  };

  if (fields) {
    fields.forEach((fieldDef) => {
      if (fieldDef.aggregate) {
        const groupBy = fields.filter((f) => f.bin || f.timeUnit).map((f) => f.name);
        if (groupBy.length) {
          vlSpec.transform!.push({ aggregate: [{ op: fieldDef.aggregate, field: fieldDef.name, as: fieldDef.name }], groupby: groupBy });
        }
      }
      if (fieldDef.bin) {
        vlSpec.transform!.push({ bin: fieldDef.bin, field: fieldDef.name, as: fieldDef.name });
      }
      if (fieldDef.timeUnit) {
        vlSpec.transform!.push({ timeUnit: fieldDef.timeUnit, field: fieldDef.name, as: fieldDef.name });
      }
    });
  }

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
