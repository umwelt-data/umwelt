import type { GalleryExample } from './types.js';

export const layeredChart: GalleryExample = {
  id: 'layered-chart',
  title: 'Layered chart',
  description: 'Stock prices as points, layered with a line showing the mean price across companies. One sonification plays each company over time; the other plays the yearly mean.',
  tags: {
    visual: 'Layered points + mean line',
    audio: 'Per-company sweep plus the yearly mean',
    text: 'Companies plus an overall mean',
  },
  spec: {
    data: {
      name: 'stocks.csv',
      url: 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/stocks.csv',
    },
    fields: [
      { name: 'symbol', type: 'nominal' },
      { name: 'date', type: 'temporal' },
      { name: 'price', type: 'quantitative' },
    ],
    key: ['symbol', 'date'],
    visual: {
      units: [
        {
          name: 'vis_unit_0',
          mark: 'point',
          encoding: {
            x: { field: 'date', timeUnit: 'year' },
            y: { field: 'price' },
            color: { field: 'symbol' },
          },
        },
        {
          name: 'vis_unit_1',
          mark: 'line',
          encoding: {
            x: { field: 'date' },
            y: { field: 'price', aggregate: 'mean' },
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
            pitch: { field: 'price' },
          },
          traversal: [{ field: 'symbol' }, { field: 'date' }],
        },
        {
          name: 'audio_unit_1',
          encoding: {
            pitch: { field: 'price', aggregate: 'mean' },
          },
          traversal: [{ field: 'date', timeUnit: 'year' }],
        },
      ],
      composition: 'concat',
    },
  },
};
