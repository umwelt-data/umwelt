import type { GalleryExample } from './types.js';

export const concatChart: GalleryExample = {
  id: 'concat-chart',
  title: 'Concatenated chart',
  description: 'Seattle weather as two concatenated views: daily maximum temperatures by month, and a bar chart counting days by weather type. Each view has a matching sonification.',
  tags: {
    visual: 'Concatenated views',
    audio: 'Monthly temperature, then weather-type counts',
    text: 'One structure per view',
  },
  spec: {
    data: {
      name: 'seattle-weather.csv',
      url: 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/seattle-weather.csv',
    },
    fields: [
      { name: 'date', type: 'temporal' },
      { name: 'temp_max', type: 'quantitative' },
      { name: 'weather', type: 'nominal' },
      { name: 'precipitation', type: 'quantitative' },
    ],
    key: ['date'],
    visual: {
      units: [
        {
          mark: 'point',
          encoding: {
            x: { field: 'date', timeUnit: 'month' },
            y: { field: 'temp_max' },
            color: { field: 'weather' },
            size: { field: 'precipitation' },
          },
        },
        {
          mark: 'bar',
          encoding: {
            y: { field: 'weather' },
            x: { field: 'temp_max', aggregate: 'count' },
            color: { field: 'weather' },
          },
        },
      ],
      composition: 'concat',
    },
    audio: {
      units: [
        {
          encoding: {
            pitch: { field: 'temp_max', aggregate: 'mean' },
          },
          traversal: [{ field: 'date', timeUnit: 'month' }],
        },
        {
          encoding: {
            pitch: { field: 'temp_max', aggregate: 'count' },
          },
          traversal: [{ field: 'weather' }],
        },
      ],
      composition: 'concat',
    },
  },
};
