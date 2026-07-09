import type { GalleryExample } from './types.js';

export const distribution: GalleryExample = {
  id: 'distribution',
  title: 'Distribution',
  description:
    'The distribution of engine horsepower across cars. The sonification sweeps through horsepower bins and plays the number of cars in each bin as pitch, so the shape of the distribution becomes an audible contour that rises to a peak at the most common horsepower.',
  tags: {
    visual: 'Histogram',
    audio: 'Audio histogram — pitch is the count in each bin',
    text: 'Counts by horsepower bin',
  },
  spec: {
    data: {
      name: 'cars.json',
      url: 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/cars.json',
    },
    fields: [{ name: 'Horsepower', type: 'quantitative' }],
    key: [],
    visual: {
      name: 'vis_unit_0',
      mark: 'bar',
      encoding: {
        x: { field: 'Horsepower', bin: true },
        y: { field: 'Horsepower', aggregate: 'count' },
      },
    },
    audio: {
      name: 'audio_unit_0',
      encoding: {
        pitch: { field: 'Horsepower', aggregate: 'count' },
      },
      traversal: [{ field: 'Horsepower', bin: true }],
    },
  },
};
