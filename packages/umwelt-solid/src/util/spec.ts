import { type OlliVisSpec, type OlliTimeUnit, type UnitOlliVisSpec, isMultiSpec } from 'olli';
import { VegaLiteAdapter } from 'olli/adapters';
import { UmweltSpec, VlSpec, UmweltDataset, NONE, ExportableSpec, EncodingFieldDef, FieldDef, ResolvedFieldDef, isVisualProp, ExportableFieldDef, EncodingRef, isExportableUmweltURLDataSource, ExportableUmweltDataSource } from '../types';
import { getDomain } from './domain';
import cloneDeep from 'lodash.clonedeep';
import { withExternalStateParam } from '@umwelt-data/umwelt-utils/vl-bridge';
import LZString from 'lz-string';
import { UmweltDatastore, UmweltDatastoreEntry } from '../contexts/UmweltDatastoreContext';
import { DEFAULT_DATASET_NAME, EXAMPLE_DATASETS, resolveDataSource } from './datasets';

export function getFieldDef(spec: UmweltSpec, field: string | undefined) {
  return spec.fields.find((f) => f.name === field);
}

export function resolveFieldDef(specFieldDef: FieldDef, encFieldDef?: EncodingFieldDef): ResolvedFieldDef {
  const { active, name, encodings, ...fieldDef } = specFieldDef;
  const resolvedFieldDef = encFieldDef
    ? {
        ...fieldDef,
        ...encFieldDef,
      }
    : { field: name, ...fieldDef };
  // TODO fix type jank
  // remember, filter has to be after spread so that NONE can overwrite other values
  return Object.fromEntries(Object.entries(resolvedFieldDef).filter(([k, v]) => v !== NONE)) as unknown as ResolvedFieldDef;
}

export function decodeSpecFromString(specString: string): ExportableSpec | undefined {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(specString);
    if (!decompressed) {
      return undefined;
    }
    return JSON.parse(decompressed);
  } catch (e) {
    console.warn('Failed to decode spec:', e);
    return undefined;
  }
}

export async function validateSpecAsync(spec: ExportableSpec, datastore: UmweltDatastore, setDataset: (name: string, data: UmweltDataset, sourceUrl?: string) => void): Promise<UmweltSpec | undefined> {
  if (!spec.data) {
    return undefined;
  }
  if (!(spec.fields && spec.fields.length)) {
    return undefined;
  }

  // if this datastore already holds the data (e.g. a re-render), skip resolution
  const dataName = spec.data.name;
  if (dataName && datastore[dataName]?.data?.length) {
    return elaborateExportableSpec(spec);
  }

  const resolved = await resolveDataSource(spec.data);
  if (!resolved) {
    return undefined;
  }
  setDataset(resolved.name, resolved.data, resolved.sourceUrl);

  return elaborateExportableSpec(spec);
}

export function elaborateExportableSpec(spec: ExportableSpec): UmweltSpec {
  // add encoding refs back to fields
  const fields: FieldDef[] = spec.fields.map((field) => {
    const encodings: EncodingRef[] = [];
    spec.visual.units.forEach((unit) => {
      Object.entries(unit.encoding).forEach(([channel, encoding]) => {
        if (isVisualProp(channel) && encoding.field === field.name) {
          encodings.push({ unit: unit.name, property: channel });
        }
      });
    });
    spec.audio.units.forEach((unit) => {
      Object.entries(unit.encoding).forEach(([channel, encoding]) => {
        if (channel === 'pitch' && encoding.field === field.name) {
          encodings.push({ unit: unit.name, property: channel });
        }
      });
    });
    return { ...field, active: true, encodings };
  });
  const newSpec: UmweltSpec = {
    ...spec,
    data: {
      name: spec.data.name || (isExportableUmweltURLDataSource(spec.data) ? spec.data.url.split('/').pop() : DEFAULT_DATASET_NAME) || DEFAULT_DATASET_NAME,
    },
    fields,
  };
  return newSpec;
}

export function umweltToVegaLiteSpec(spec: UmweltSpec, data: UmweltDataset): VlSpec | undefined {
  if (spec.visual.units.length === 0) {
    return undefined;
  }

  const countEncodings = spec.visual.units
    .map((unit) => {
      return Object.values(unit.encoding).length;
    })
    .reduce((a, b) => a + b, 0);

  if (countEncodings === 0) return undefined;

  const params: any = [
    {
      name: 'brush',
      select: 'interval',
    },
  ];

  function compileUnits(spec: UmweltSpec): any {
    const units = spec.visual.units;

    if (units.length === 1) {
      const unit = units[0];
      const encoding = cloneDeep(unit.encoding);
      if (encoding) {
        Object.keys(encoding).forEach((channel) => {
          if (isVisualProp(channel)) {
            const encDef = encoding[channel];
            if (encDef) {
              const specFieldDef = getFieldDef(spec, encDef.field);
              if (specFieldDef) {
                const resolvedFieldDef = resolveFieldDef(specFieldDef, encDef);
                encoding[channel] = {
                  ...resolvedFieldDef,
                };
                if (channel === 'facet') {
                  const domain = getDomain(resolvedFieldDef, data);
                  encoding[channel] = {
                    ...resolvedFieldDef,
                    columns: domain.length === 3 ? 3 : 2, // TODO do something better
                  } as any;
                }
                if (unit.mark === 'point') {
                  if ((channel === 'x' || channel === 'y') && resolvedFieldDef.type === 'quantitative') {
                    encoding[channel] = {
                      ...resolvedFieldDef,
                      scale: {
                        ...resolvedFieldDef.scale,
                        zero: false,
                      },
                    };
                  }
                }
              }
            }
          }
        });
      }
      return {
        mark: unit.mark,
        encoding: {
          ...encoding,
          color: {
            ...condition({ ...(encoding.color || { value: 'navy' }), scale: unit.mark === 'area' ? { scheme: 'category20b' } : undefined }, 'brush', 'grey'),
          },
        },
      };
    } else if (units.length > 1) {
      const op = spec.visual.composition || 'layer';
      return {
        columns: op === 'concat' ? (units.length < 3 ? 1 : 2) : undefined,
        [op]: units.map((unit, idx) => {
          const compiled = compileUnits({
            ...spec,
            visual: {
              units: [unit],
              composition: op,
            },
          });
          if (idx === 0) {
            compiled['params'] = params;
          }
          return compiled;
        }),
      };
    }
  }

  if (spec.visual.units[0].mark === 'line' || spec.visual.units[0].mark === 'bar') {
    const unit = spec.visual.units[0];
    const yField = unit.encoding.y?.field;
    const xField = unit.encoding.x?.field;
    const yFieldDef = getFieldDef(spec, yField);
    const xFieldDef = getFieldDef(spec, xField);
    if (yFieldDef?.type === 'quantitative' && xFieldDef?.type !== 'quantitative') {
      params[0]['select'] = { type: 'interval', encodings: ['x'] };
    } else if (xFieldDef?.type === 'quantitative' && yFieldDef?.type !== 'quantitative') {
      params[0]['select'] = { type: 'interval', encodings: ['y'] };
    }
  }

  const condition = (encoding: any, paramName: string, value: any, empty?: boolean) => {
    const condition = { param: paramName, empty: empty || true, ...encoding };
    return {
      condition,
      value,
    };
    // return encoding; // TODO
  };

  const compiled = compileUnits(spec);
  let vlSpec: VlSpec;
  if ('mark' in compiled) {
    vlSpec = cloneDeep({
      data: { values: data },
      params,
      ...compiled,
    });
  } else {
    vlSpec = cloneDeep({
      data: { values: data },
      ...compiled,
    });
  }
  return withExternalStateParam(vlSpec as unknown as Record<string, unknown>) as unknown as VlSpec;
}

export async function umweltToOlliSpec(spec: UmweltSpec, data: UmweltDataset): Promise<OlliVisSpec> {
  let olliSpec: OlliVisSpec;
  const vlSpec = umweltToVegaLiteSpec(spec, data);
  if (vlSpec) {
    olliSpec = await VegaLiteAdapter(vlSpec);
  } else {
    olliSpec = {
      data: data as any,
      fields: [],
    };
  }

  if (isMultiSpec(olliSpec)) {
    olliSpec.units.forEach((unit) => {
      handleUnitSpec(unit, spec);
    });
  } else {
    handleUnitSpec(olliSpec, spec);
  }

  function handleUnitSpec(olliSpec: UnitOlliVisSpec, spec: UmweltSpec) {
    if (olliSpec.fields?.length === 0) {
      delete olliSpec.mark;
      delete olliSpec.axes;
      delete olliSpec.legends;
    }
    if (olliSpec.fields) {
      spec.fields
        .filter((f) => f.active)
        .forEach((field) => {
          // if field is not in olliSpec.fields, add it
          if (!olliSpec.fields?.find((f) => f.field === field.name)) {
            olliSpec.fields?.push({
              ...field,
              field: field.name,
              timeUnit: field.timeUnit as OlliTimeUnit,
            });
          }
        });
    }
  }

  return olliSpec;
}

export function exportableSpec(spec: UmweltSpec, datastore: UmweltDatastore): ExportableSpec {
  const { fields, data: _data, ...rest } = spec;
  const exportableFields: ExportableFieldDef[] = fields
    .filter((field) => field.active)
    .map((field) => {
      const { encodings, active, ...rest } = field;
      return rest;
    });

  // Most compact data source that can be resolved on import:
  // example dataset name > source URL > embedded values.
  // Constructed so that `data` serializes last, keeping embedded values from burying the rest of the spec.
  const entry = datastore[spec.data.name];
  const exampleUrl = EXAMPLE_DATASETS[spec.data.name];
  let data: ExportableUmweltDataSource;
  if (exampleUrl && (!entry?.sourceUrl || entry.sourceUrl === exampleUrl)) {
    data = { name: spec.data.name };
  } else if (entry?.sourceUrl) {
    data = { name: spec.data.name, url: entry.sourceUrl };
  } else {
    data = { name: spec.data.name, values: entry?.data || [] };
  }

  return { ...rest, fields: exportableFields, data };
}

export function prettyPrintSpec(spec: UmweltSpec | ExportableSpec): string {
  return JSON.stringify(spec, null, 2);
}

export function compressedSpec(spec: UmweltSpec, datastore: UmweltDatastore): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(exportableSpec(spec, datastore)));
}

export function shareSpecURL(spec: UmweltSpec, datastore: UmweltDatastore): string {
  const specString = compressedSpec(spec, datastore);
  // spec goes in the hash fragment so it is never sent to the server
  const url = new URL(window.location.href);
  url.hash = `spec=${specString}`;
  return url.toString();
}
