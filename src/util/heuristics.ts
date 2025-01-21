// default specification heuristics

import { VisualSpec, AudioSpec, FieldName, MeasureType, UmweltDataset, FieldDef } from '../types';
import { getDomain } from './domain';
import { resolveFieldDef } from './spec';

interface DefaultSpec {
  visual: VisualSpec;
  audio: AudioSpec;
}

type DefaultSpecGenerator = (keys: FieldDef[], values: FieldDef[], data: UmweltDataset) => DefaultSpec;

interface HeuristicConstraint {
  type: MeasureType | MeasureType[];
}

interface Heuristic {
  key: {
    count: number;
    constraints: HeuristicConstraint[];
  };
  value: {
    count: number;
    constraints: HeuristicConstraint[];
  };
}

interface HeuristicSpecMapping {
  heuristic: Heuristic;
  specFn: DefaultSpecGenerator;
}

const heuristicSpecMappings: HeuristicSpecMapping[] = [
  // single quantitative value -> 1d dotplot
  {
    heuristic: {
      key: {
        count: 0,
        constraints: [],
      },
      value: {
        count: 1,
        constraints: [{ type: 'quantitative' }],
      },
    },
    specFn: (keys, values, data) => {
      return {
        visual: {
          units: [
            {
              name: 'vis_unit_0',
              mark: 'point',
              encoding: {
                x: { field: values[0].name },
              },
            },
          ],
          composition: 'layer',
        },
        audio: {
          units: [
            {
              name: 'audio_unit_0',
              encoding: {
                volume: { field: values[0].name, aggregate: 'count' },
              },
              traversal: [{ field: values[0].name, bin: true }],
            },
          ],
          composition: 'concat',
        },
      };
    },
  },
  // single quantitative value + single key -> line and bar charts
  {
    heuristic: {
      key: {
        count: 1,
        constraints: [],
      },
      value: {
        count: 1,
        constraints: [{ type: 'quantitative' }],
      },
    },
    specFn: (keys, values, data) => {
      return {
        visual: {
          units: [
            {
              name: 'vis_unit_0',
              mark: keys[0].type === 'quantitative' ? 'point' : keys[0].type === 'temporal' ? 'line' : 'bar',
              encoding: {
                x: { field: keys[0].name },
                y: { field: values[0].name },
              },
            },
          ],
          composition: 'layer',
        },
        audio: {
          units: [
            {
              name: 'audio_unit_0',
              encoding: {
                pitch: { field: values[0].name },
              },
              traversal: [{ field: keys[0].name }],
            },
          ],
          composition: 'concat',
        },
      };
    },
  },
  // single quantitative value + two keys (temporal and categorical) -> multi-series line or bubble plot
  {
    heuristic: {
      key: {
        count: 2,
        constraints: [{ type: 'temporal' }, { type: ['nominal', 'ordinal'] }],
      },
      value: {
        count: 1,
        constraints: [{ type: 'quantitative' }],
      },
    },
    specFn: (keys, values, data) => {
      const temporalKey = keys.find((key) => key.type === 'temporal'); // TODO handle timeUnit
      const categoricalKey = keys.find((key) => key.type === 'nominal' || key.type === 'ordinal');

      if (!temporalKey || !categoricalKey) {
        throw new Error('Invalid keys for heuristic');
      }

      const categoricalDomainLength = getDomain(resolveFieldDef(categoricalKey), data).length;

      if (categoricalDomainLength > 5 || temporalKey.timeUnit) {
        // bubble plot
        return {
          visual: {
            units: [
              {
                name: 'vis_unit_0',
                mark: 'point',
                encoding: {
                  x: { field: temporalKey.name },
                  y: { field: categoricalKey.name },
                  color: { field: categoricalKey.name },
                  size: { field: values[0].name },
                },
              },
            ],
            composition: 'layer',
          },
          audio: {
            units: [
              {
                name: 'audio_unit_0',
                encoding: {
                  pitch: { field: values[0].name },
                },
                traversal: [{ field: categoricalKey.name }, { field: temporalKey.name }],
              },
            ],
            composition: 'concat',
          },
        };
      } else {
        // multi-series line
        return {
          visual: {
            units: [
              {
                name: 'vis_unit_0',
                mark: 'line',
                encoding: {
                  x: { field: temporalKey.name },
                  y: { field: values[0].name },
                  color: { field: categoricalKey.name },
                },
              },
            ],
            composition: 'layer',
          },
          audio: {
            units: [
              {
                name: 'audio_unit_0',
                encoding: {
                  pitch: { field: values[0].name },
                },
                traversal: [{ field: categoricalKey.name }, { field: temporalKey.name }],
              },
            ],
            composition: 'concat',
          },
        };
      }
    },
  },
  // single quantitative value and 3 keys -> faceted dotplot
  {
    heuristic: {
      key: {
        count: 3,
        constraints: [],
      },
      value: {
        count: 1,
        constraints: [{ type: 'quantitative' }],
      },
    },
    specFn: (keys, values, data) => {
      const sortedKeys = [...keys].sort((a, b) => {
        const aDomainLength = getDomain(resolveFieldDef(a), data).length;
        const bDomainLength = getDomain(resolveFieldDef(b), data).length;
        // sort by shortest domain length first
        return aDomainLength - bDomainLength;
      });
      return {
        visual: {
          units: [
            {
              name: 'vis_unit_0',
              mark: 'point',
              encoding: {
                x: { field: values[0].name },
                y: { field: sortedKeys[2].name },
                color: { field: sortedKeys[0].name },
                facet: { field: sortedKeys[1].name },
              },
            },
          ],
          composition: 'layer',
        },
        audio: {
          units: [
            {
              name: 'audio_unit_0',
              encoding: {
                pitch: { field: values[0].name },
              },
              traversal: [{ field: sortedKeys[1].name }, { field: sortedKeys[2].name }, { field: sortedKeys[0].name }], // TODO double check order?
            },
          ],
          composition: 'concat',
        },
      };
    },
  },
  // 2 values (quantitative and temporal) -> temporal dot plot
  {
    heuristic: {
      key: {
        count: 0,
        constraints: [],
      },
      value: {
        count: 2,
        constraints: [{ type: 'quantitative' }, { type: 'temporal' }],
      },
    },
    specFn: (keys, values, data) => {
      const temporalValue = values.find((f) => f.type === 'temporal');
      const quantValue = values.find((f) => f.type === 'quantitative');

      if (!temporalValue || !quantValue) {
        throw new Error('Invalid values for heuristic');
      }

      return {
        visual: {
          units: [
            {
              name: 'vis_unit_0',
              mark: 'point',
              encoding: {
                x: { field: temporalValue.name },
                y: { field: quantValue.name },
              },
            },
          ],
          composition: 'layer',
        },
        audio: {
          units: [
            {
              name: `audio_unit_0`,
              encoding: {
                pitch: { field: quantValue.name, aggregate: 'mean' },
              },
              traversal: [{ field: temporalValue.name }],
            },
          ],
          composition: 'concat',
        },
      };
    },
  },
  // 0 keys and 2 quantitative values -> scatter plot
  {
    heuristic: {
      key: {
        count: 0,
        constraints: [],
      },
      value: {
        count: 2,
        constraints: [{ type: 'quantitative' }, { type: 'quantitative' }],
      },
    },
    specFn: (keys, values, data) => {
      // scatterplot
      const quantValues = values.filter((f) => f.type === 'quantitative');
      const encodeValues = quantValues.filter((f) => !f.bin).length === 1 ? quantValues.filter((f) => !f.bin) : quantValues;
      return {
        visual: {
          units: [
            {
              name: 'vis_unit_0',
              mark: 'point',
              encoding: {
                x: { field: quantValues[0].name },
                y: { field: quantValues[1].name },
              },
            },
          ],
          composition: 'layer',
        },
        audio: {
          units: encodeValues.map((f, i) => {
            return {
              name: `audio_unit_${i}`,
              encoding: {
                pitch: { field: f.name, aggregate: 'mean' },
              },
              traversal: quantValues
                .filter((field) => field.name !== f.name)
                .map((f) => {
                  return { field: f.name, bin: true };
                }),
            };
          }),
          composition: 'concat',
        },
      };
    },
  },
  // 0 keys and 3 values (2 quantitative, 1 categorical) -> scatter plot with color
  {
    heuristic: {
      key: {
        count: 0,
        constraints: [],
      },
      value: {
        count: 3,
        constraints: [{ type: 'quantitative' }, { type: 'quantitative' }, { type: ['nominal', 'ordinal'] }],
      },
    },
    specFn: (keys, values, data) => {
      // scatterplot with color
      const quantValues = values.filter((f) => f.type === 'quantitative');
      const encodeValues = quantValues.filter((f) => !f.bin).length === 1 ? quantValues.filter((f) => !f.bin) : quantValues;
      const categoricalValue = values.find((f) => f.type === 'nominal' || f.type === 'ordinal');

      if (!categoricalValue || quantValues.length !== 2) {
        throw new Error('Invalid values for heuristic');
      }

      return {
        visual: {
          units: [
            {
              name: 'vis_unit_0',
              mark: 'point',
              encoding: {
                x: { field: quantValues[0].name },
                y: { field: quantValues[1].name },
                color: { field: categoricalValue.name },
              },
            },
          ],
          composition: 'layer',
        },
        audio: {
          units: encodeValues.map((f, i) => {
            return {
              name: `audio_unit_${i}`,
              encoding: {
                pitch: { field: f.name, aggregate: 'mean' },
              },
              traversal: quantValues
                .filter((field) => field.name !== f.name)
                .map((f) => {
                  return { field: f.name, bin: true };
                }),
            };
          }),
          composition: 'concat',
        },
      };
    },
  },
  // two quantitative values and 1 key (temporal or ordinal) -> connected scatterplot
  {
    heuristic: {
      key: {
        count: 1,
        constraints: [{ type: ['temporal', 'ordinal'] }],
      },
      value: {
        count: 2,
        constraints: [{ type: 'quantitative' }, { type: 'quantitative' }],
      },
    },
    specFn: (keys, values, data) => {
      const quantValues = values.filter((f) => f.type === 'quantitative');

      if (quantValues.length !== 2) {
        throw new Error('Invalid values for heuristic');
      }

      return {
        visual: {
          units: [
            {
              name: 'vis_unit_0',
              mark: 'line',
              encoding: {
                x: { field: quantValues[0].name },
                y: { field: quantValues[1].name },
                order: { field: keys[0].name },
              },
            },
          ],
          composition: 'layer',
        },
        audio: {
          units: [
            {
              name: 'audio_unit_0',
              encoding: {
                pitch: { field: quantValues[0].name },
              },
              traversal: [{ field: keys[0].name }],
            },
            {
              name: 'audio_unit_1',
              encoding: {
                pitch: { field: quantValues[1].name },
              },
              traversal: [{ field: keys[0].name }],
            },
          ],
          composition: 'concat',
        },
      };
    },
  },
  // 2 quantitative values and 2 keys (temporal and categorical) -> faceted connected scatterplot
  {
    heuristic: {
      key: {
        count: 2,
        constraints: [{ type: 'temporal' }, { type: ['nominal', 'ordinal'] }],
      },
      value: {
        count: 2,
        constraints: [{ type: 'quantitative' }, { type: 'quantitative' }],
      },
    },
    specFn: (keys, values, data) => {
      const temporalKey = keys.find((key) => key.type === 'temporal'); // TODO handle timeUnit
      const categoricalKey = keys.find((key) => key.type === 'nominal' || key.type === 'ordinal');
      const quantValues = values.filter((f) => f.type === 'quantitative');

      if (!temporalKey || !categoricalKey || quantValues.length !== 2) {
        throw new Error('Invalid keys for heuristic');
      }

      return {
        visual: {
          units: [
            {
              name: 'vis_unit_0',
              mark: 'line',
              encoding: {
                x: { field: quantValues[0].name },
                y: { field: quantValues[1].name },
                facet: { field: categoricalKey.name },
                color: { field: categoricalKey.name },
                order: { field: temporalKey.name },
              },
            },
          ],
          composition: 'layer',
        },
        audio: {
          units: [
            {
              name: 'audio_unit_0',
              encoding: {
                pitch: { field: quantValues[0].name },
              },
              traversal: [{ field: categoricalKey.name }, { field: temporalKey.name }],
            },
            {
              name: 'audio_unit_1',
              encoding: {
                pitch: { field: quantValues[1].name },
              },
              traversal: [{ field: categoricalKey.name }, { field: temporalKey.name }],
            },
          ],
          composition: 'concat',
        },
      };
    },
  },
];

function evaluateHeuristic(heuristic: Heuristic, keys: FieldDef[], values: FieldDef[]): boolean {
  const lengthsMatch = keys.length === heuristic.key.count && values.length === heuristic.value.count;
  const keysMatched = new Set<number>();
  const valuesMatched = new Set<number>();
  // iterate through heuristic constraints
  for (const constraint of heuristic.key.constraints) {
    for (let i = 0; i < keys.length; i++) {
      if (keysMatched.has(i)) {
        continue;
      }
      if (constraint.type === keys[i].type || (Array.isArray(constraint.type) && constraint.type.includes(keys[i].type!))) {
        keysMatched.add(i);
        break;
      }
    }
  }
  for (const constraint of heuristic.value.constraints) {
    for (let i = 0; i < values.length; i++) {
      if (valuesMatched.has(i)) {
        continue;
      }
      if (constraint.type === values[i].type || (Array.isArray(constraint.type) && constraint.type.includes(values[i].type!))) {
        valuesMatched.add(i);
        break;
      }
    }
  }

  return lengthsMatch && keysMatched.size === heuristic.key.constraints.length && valuesMatched.size === heuristic.value.constraints.length;
}

export const getDefaultSpec = (keys: FieldDef[], values: FieldDef[], data: UmweltDataset): DefaultSpec => {
  for (const mapping of heuristicSpecMappings) {
    if (evaluateHeuristic(mapping.heuristic, keys, values)) {
      return mapping.specFn(keys, values, data);
    }
  }

  return {
    visual: {
      units: [],
      composition: 'layer',
    },
    audio: {
      units: [],
      composition: 'concat',
    },
  };
};
