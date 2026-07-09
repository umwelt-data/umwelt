import type { GalleryExample } from './types.js';

export const trellisPlot: GalleryExample = {
  id: 'trellis-plot',
  title: 'Trellis plot',
  description: 'The classic barley trellis: yield by variety, faceted into one panel per site. The sonification nests site, variety, and year, playing yield as pitch.',
  tags: {
    visual: 'Trellis (faceted) plot',
    audio: 'Pitch nested site → variety → year',
    text: 'Nested by site, variety, year',
  },
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
      mark: 'point',
      encoding: {
        y: { field: 'variety' },
        x: { field: 'yield' },
        color: { field: 'year', type: 'nominal' },
        facet: { field: 'site' },
      },
    },
    audio: {
      encoding: {
        pitch: { field: 'yield' },
      },
      traversal: [{ field: 'site' }, { field: 'variety' }, { field: 'year' }],
    },
  },
};
