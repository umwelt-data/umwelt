import { VegaLiteAdapter } from 'olli-adapters';
import { UmweltSpec, VlSpec, VisualEncodingFieldDef, UmweltDataset, NONE, AudioSpec, ExportableSpec, EncodingFieldDef, AudioTraversalFieldDef, FieldDef, ResolvedFieldDef } from '../types';
import { getDomain } from './domain';
import cloneDeep from 'lodash.clonedeep';
import { OlliSpec, OlliTimeUnit, UnitOlliSpec } from 'olli';
import LZString from 'lz-string';
import { UmweltDatastore } from '../contexts/UmweltDatastoreContext';
import { cleanData, typeCoerceData } from './datasets';

export function getFieldDef(spec: UmweltSpec, field: string | undefined) {
  return spec.fields.find((f) => f.name === field);
}

export function resolveFieldDef(specFieldDef: FieldDef, encFieldDef?: EncodingFieldDef): ResolvedFieldDef {
  const { active, name, encodings, ...fieldDef } = specFieldDef;
  const elaboratedFieldDef = encFieldDef
    ? {
        ...fieldDef,
        ...encFieldDef,
      }
    : { field: name, ...fieldDef };
  // TODO fix type jank
  // remember, filter has to be after spread so that NONE can overwrite other values
  return Object.fromEntries(Object.entries(elaboratedFieldDef).filter(([k, v]) => v !== NONE)) as unknown as ResolvedFieldDef;
}

export function validateSpec(spec: ExportableSpec, datastore: UmweltDatastore): UmweltSpec | undefined {
  if (!spec.data?.name) {
    return undefined;
  }
  if (!(spec.fields && spec.fields.length)) {
    return undefined;
  }
  const data = datastore[spec.data.name];
  if (!data || !data.length) {
    return undefined;
  }
  const newSpec: UmweltSpec = {
    ...spec,
    data: { name: spec.data.name, values: cleanData(typeCoerceData(data, spec.fields), spec.fields) },
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
    {
      name: 'external_state',
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
          const encDef = encoding[channel];
          if (encDef) {
            const specFieldDef = getFieldDef(spec, encDef.field);
            if (specFieldDef) {
              const { active, name, encodings, ...fieldDef } = specFieldDef;
              encoding[channel] = {
                ...fieldDef,
                ...encDef,
              };
              encoding[channel] = Object.fromEntries(Object.entries(encoding[channel]!).filter(([k, v]) => v !== NONE)) as VisualEncodingFieldDef;
              if (channel === 'facet') {
                const domain = getDomain(encDef, data);
                encoding[channel] = {
                  ...fieldDef,
                  ...encDef,
                  columns: domain.length === 3 ? 3 : 2, // TODO do something better
                } as any;
              }
              if (unit.mark === 'point') {
                if ((channel === 'x' || channel === 'y') && fieldDef.type === 'quantitative') {
                  encoding[channel] = {
                    ...fieldDef,
                    ...encDef,
                    scale: {
                      ...encDef.scale,
                      zero: false,
                    },
                  };
                }
              }
            }
          }
        });
      }
      return {
        mark: unit.mark === 'line' ? { type: 'line', point: true } : unit.mark,
        encoding: {
          ...encoding,
          opacity: condition(encoding.opacity || { value: 1 }, 'external_state', 0.3, false),
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
  if ('mark' in compiled) {
    return cloneDeep({
      data: { values: data },
      params,
      ...compiled,
    });
  } else {
    return cloneDeep({
      data: { values: data },
      ...compiled,
    });
  }
}

export async function umweltToOlliSpec(spec: UmweltSpec, data: UmweltDataset): Promise<OlliSpec> {
  let olliSpec: OlliSpec;
  const vlSpec = umweltToVegaLiteSpec(spec, data);
  if (vlSpec) {
    olliSpec = await VegaLiteAdapter(vlSpec);
  } else {
    olliSpec = {
      data,
      fields: [],
    };
  }

  if ('units' in olliSpec) {
    // multi-spec
    olliSpec.units.forEach((unit) => {
      handleUnitSpec(unit, spec);
    });
  } else {
    handleUnitSpec(olliSpec, spec);
  }

  function handleUnitSpec(olliSpec: UnitOlliSpec, spec: UmweltSpec) {
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

export function exportableSpec(spec: UmweltSpec): ExportableSpec {
  const { data, ...rest } = spec;
  return { ...rest, data: { name: data.name } };
}

export function prettyPrintSpec(spec: UmweltSpec): string {
  return JSON.stringify(spec, null, 2);
}

export function shareSpecURL(spec: UmweltSpec): string {
  const specString = LZString.compressToEncodedURIComponent(JSON.stringify(exportableSpec(spec)));
  const url = new URL(window.location.origin);
  url.searchParams.set('spec', specString);
  return url.toString();
}
