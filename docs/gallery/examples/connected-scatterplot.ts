import type { GalleryExample } from './types.js';

export const connectedScatterplot: GalleryExample = {
  id: 'connected-scatterplot',
  title: 'Connected scatterplot',
  description: 'Gas prices versus miles driven in the US, connected year by year. Two sonifications traverse the years, one playing miles as pitch and the other playing gas prices.',
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
      units: [
        {
          name: 'vis_unit_0',
          mark: 'line',
          encoding: {
            x: { field: 'miles' },
            y: { field: 'gas' },
            order: { field: 'year' },
          },
        },
      ],
    },
    audio: {
      units: [
        {
          name: 'audio_unit_0',
          encoding: {
            pitch: { field: 'miles' },
          },
          traversal: [{ field: 'year' }],
        },
        {
          name: 'audio_unit_1',
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
