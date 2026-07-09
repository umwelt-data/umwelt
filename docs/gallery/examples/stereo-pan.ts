import type { GalleryExample } from './types.js';

export const stereoPan: GalleryExample = {
  id: 'stereo-pan',
  title: 'Stereo panning',
  description:
    'U.S. population by age group. The sonification sweeps from youngest to oldest, mapping the number of people to pitch and the age group to stereo pan — so the sound moves left to right across the age axis as it plays, placing the value in space as well as pitch.',
  tags: {
    visual: 'Bar chart',
    audio: 'Pitch is population; stereo pan follows the age axis',
    text: 'Ordered by age group',
  },
  spec: {
    data: {
      name: 'population.json',
      url: 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/population.json',
    },
    fields: [
      { name: 'age', type: 'ordinal' },
      { name: 'people', type: 'quantitative' },
    ],
    key: [],
    visual: {
      mark: 'bar',
      encoding: {
        x: { field: 'age' },
        y: { field: 'people', aggregate: 'mean' },
      },
    },
    audio: {
      encoding: {
        pitch: { field: 'people', aggregate: 'mean' },
        pan: { field: 'age' },
      },
      traversal: [{ field: 'age' }],
    },
  },
};
