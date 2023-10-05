import { UmweltSpec, VlSpec, NONE, VisualEncodingFieldDef, UmweltDataset } from '../types';
import { getDomain } from './domain';
import cloneDeep from 'lodash.clonedeep';

export function validateSpec(spec: UmweltSpec) {
  if (!spec.data) {
    return false;
  }
  if (!(spec.fields && spec.fields.length)) {
    return false;
  }
  return true;
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
            const specFieldDef = spec.fields.find((field) => field.name === encDef.field);
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
                  ...encDef,
                  columns: domain.length === 3 ? 3 : 2, // TODO do something better
                } as any;
              }
              if (unit.mark === 'point') {
                if ((channel === 'x' || channel === 'y') && fieldDef.type === 'quantitative') {
                  encoding[channel] = {
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
    const yFieldDef = spec.fields.find((field) => field.name === yField);
    const xFieldDef = spec.fields.find((field) => field.name === xField);
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
    return {
      data: { values: data },
      params,
      ...compiled,
    };
  } else {
    return {
      data: { values: data },
      ...compiled,
    };
  }
}
