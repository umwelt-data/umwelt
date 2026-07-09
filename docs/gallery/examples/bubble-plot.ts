import type { GalleryExample } from './types.js';

export const bubblePlot: GalleryExample = {
  id: 'bubble-plot',
  title: 'Bubble plot',
  description: 'Global deaths from natural disasters by year, one row per disaster type with bubbles sized by deaths. The sonification traverses each disaster type over the years, playing deaths as pitch.',
  tags: {
    visual: 'Bubble plot',
    audio: 'Pitch nested by disaster type, then year',
    text: 'Grouped by disaster type',
  },
  spec: {
    data: {
      name: 'disasters.csv',
      url: 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/disasters.csv',
    },
    fields: [
      { name: 'Entity', type: 'nominal' },
      { name: 'Year', type: 'temporal', timeUnit: 'year' },
      { name: 'Deaths', type: 'quantitative' },
    ],
    key: ['Entity', 'Year'],
    visual: {
      name: 'vis_unit_0',
      mark: 'point',
      encoding: {
        x: { field: 'Year' },
        y: { field: 'Entity' },
        color: { field: 'Entity' },
        size: { field: 'Deaths' },
      },
    },
    audio: {
      name: 'audio_unit_0',
      encoding: {
        pitch: { field: 'Deaths' },
      },
      traversal: [{ field: 'Entity' }, { field: 'Year' }],
    },
  },
};
