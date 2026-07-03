import type { GalleryExample } from './types.js';

export const multiSeriesLine: GalleryExample = {
  id: 'multi-series-line',
  title: 'Multi-series line chart',
  description: 'Stock prices of five tech companies over time. The sonification maps price to pitch and plays each company as a separate sequence.',
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
          mark: 'line',
          encoding: {
            x: { field: 'date' },
            y: { field: 'price' },
            color: { field: 'symbol' },
          },
        },
      ],
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
      ],
    },
  },
};
