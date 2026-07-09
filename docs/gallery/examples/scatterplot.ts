import type { GalleryExample } from './types.js';

export const scatterplot: GalleryExample = {
  id: 'scatterplot',
  title: 'Scatterplot',
  description: 'Miles per gallon versus horsepower for cars, colored by origin. Two sonifications sweep the scatterplot along each axis: binned horsepower playing mean miles per gallon, and binned miles per gallon playing mean horsepower.',
  tags: {
    visual: 'Scatterplot',
    audio: 'Two pitch sweeps across the binned axes',
    text: 'Points grouped by origin',
  },
  spec: {
    data: {
      name: 'cars.json',
      url: 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/cars.json',
    },
    fields: [
      { name: 'Miles_per_Gallon', type: 'quantitative' },
      { name: 'Horsepower', type: 'quantitative' },
      { name: 'Origin', type: 'nominal' },
    ],
    key: [],
    visual: {
      mark: 'point',
      encoding: {
        x: { field: 'Miles_per_Gallon' },
        y: { field: 'Horsepower' },
        color: { field: 'Origin' },
      },
    },
    audio: {
      units: [
        {
          encoding: {
            pitch: { field: 'Miles_per_Gallon', aggregate: 'mean' },
          },
          traversal: [{ field: 'Horsepower', bin: true }],
        },
        {
          encoding: {
            pitch: { field: 'Horsepower', aggregate: 'mean' },
          },
          traversal: [{ field: 'Miles_per_Gallon', bin: true }],
        },
      ],
      composition: 'concat',
    },
  },
};
