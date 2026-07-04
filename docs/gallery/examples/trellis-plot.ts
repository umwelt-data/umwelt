import type { GalleryExample } from './types.js';

export const trellisPlot: GalleryExample = {
  id: 'trellis-plot',
  title: 'Trellis plot',
  description: 'The classic barley trellis: yield by variety, faceted into one panel per site. The sonification nests site, variety, and year, playing yield as pitch.',
  spec: {
    data: {
      name: 'barley.json',
      url: 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/barley.json',
    },
    fields: [
      { name: 'site', type: 'nominal' },
      { name: 'variety', type: 'nominal' },
      { name: 'year', type: 'ordinal' },
      { name: 'yield', type: 'quantitative' },
    ],
    key: ['site', 'variety', 'year'],
    visual: {
      units: [
        {
          name: 'vis_unit_0',
          mark: 'point',
          encoding: {
            y: { field: 'variety' },
            x: { field: 'yield' },
            color: { field: 'year', type: 'nominal' },
            facet: { field: 'site' },
          },
        },
      ],
    },
    audio: {
      units: [
        {
          name: 'audio_unit_0',
          encoding: {
            pitch: { field: 'yield' },
          },
          traversal: [{ field: 'site' }, { field: 'variety' }, { field: 'year' }],
        },
      ],
    },
  },
};
