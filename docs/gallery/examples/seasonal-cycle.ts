import type { GalleryExample } from './types.js';

export const seasonalCycle: GalleryExample = {
  id: 'seasonal-cycle',
  title: 'Seasonal cycle',
  description:
    'Seattle maximum temperatures, month by month across four years. Traversing the timeline in order, the sonification plays mean temperature as pitch — and the annual rise and fall becomes an unmistakable repeating contour you hear cycle four times, a periodicity that is easy to miss in the scatter of daily readings.',
  tags: {
    visual: 'Line chart',
    audio: 'A pitch sweep you hear cycle four times',
    text: 'Ordered month by month',
  },
  spec: {
    data: {
      name: 'seattle-weather.csv',
      url: 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/seattle-weather.csv',
    },
    fields: [
      { name: 'date', type: 'temporal', timeUnit: 'yearmonth' },
      { name: 'temp_max', type: 'quantitative' },
    ],
    key: ['date'],
    visual: {
      mark: 'line',
      encoding: {
        x: { field: 'date', timeUnit: 'yearmonth' },
        y: { field: 'temp_max', aggregate: 'mean' },
      },
    },
    audio: {
      encoding: {
        pitch: { field: 'temp_max', aggregate: 'mean' },
      },
      traversal: [{ field: 'date', timeUnit: 'yearmonth' }],
    },
  },
};
