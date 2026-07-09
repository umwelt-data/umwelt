import type { GalleryExample } from './types.js';

export const overlaidVoices: GalleryExample = {
  id: 'overlaid-voices',
  title: 'Overlaid voices',
  description:
    'Seattle daily high and low temperatures over the months. Two audio units share one traversal but play at the same time on distinct timbres, so you hear both series at once — the gap between the voices is the daily temperature range. Playing two measures simultaneously is something the ear can do that a single static chart cannot.',
  tags: {
    visual: 'Layered lines',
    audio: 'Daily high and low as two timbres at once',
    text: 'High and low over the months',
  },
  spec: {
    data: {
      name: 'seattle-weather.csv',
      url: 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/seattle-weather.csv',
    },
    fields: [
      { name: 'date', type: 'temporal', timeUnit: 'month' },
      { name: 'temp_max', type: 'quantitative' },
      { name: 'temp_min', type: 'quantitative' },
    ],
    key: ['date'],
    visual: {
      units: [
        {
          name: 'vis_unit_0',
          mark: 'line',
          encoding: {
            x: { field: 'date', timeUnit: 'month' },
            y: { field: 'temp_max', aggregate: 'mean' },
          },
        },
        {
          name: 'vis_unit_1',
          mark: 'line',
          encoding: {
            x: { field: 'date', timeUnit: 'month' },
            y: { field: 'temp_min', aggregate: 'mean' },
          },
        },
      ],
      composition: 'layer',
    },
    audio: {
      units: [
        {
          name: 'audio_unit_0',
          instrument: 'reed',
          encoding: {
            pitch: { field: 'temp_max', aggregate: 'mean' },
          },
          traversal: [{ field: 'date', timeUnit: 'month' }],
        },
        {
          name: 'audio_unit_1',
          instrument: 'bell',
          encoding: {
            pitch: { field: 'temp_min', aggregate: 'mean' },
          },
          traversal: [{ field: 'date', timeUnit: 'month' }],
        },
      ],
      composition: 'layer',
    },
  },
};
