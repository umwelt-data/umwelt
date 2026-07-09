import type { GalleryExample } from './types.js';

export const connectedScatterplot: GalleryExample = {
  id: 'connected-scatterplot',
  title: 'Connected scatterplot',
  description: 'Gas prices versus miles driven in the US, connected year by year. Two sonifications traverse the years, one playing miles as pitch and the other playing gas prices.',
  tags: {
    visual: 'Connected scatterplot',
    audio: 'Two pitch lines traversing the years',
    text: 'Ordered by year',
  },
  spec: {
    data: {
      name: 'driving.json',
      url: 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/driving.json',
    },
    fields: [
      { name: 'year', type: 'temporal', timeUnit: 'year' },
      { name: 'miles', type: 'quantitative' },
      { name: 'gas', type: 'quantitative' },
    ],
    key: ['year'],
    visual: {
      mark: 'line',
      encoding: {
        x: { field: 'miles' },
        y: { field: 'gas' },
        order: { field: 'year' },
      },
    },
    audio: {
      units: [
        {
          encoding: {
            pitch: { field: 'miles' },
          },
          traversal: [{ field: 'year' }],
        },
        {
          encoding: {
            pitch: { field: 'gas' },
          },
          traversal: [{ field: 'year' }],
        },
      ],
      composition: 'concat',
    },
  },
};
