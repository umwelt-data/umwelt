import type { GalleryExample } from './types.js';
import { distribution } from './distribution.js';
import { stereoPan } from './stereo-pan.js';
import { seasonalCycle } from './seasonal-cycle.js';
import { scatterplot } from './scatterplot.js';
import { connectedScatterplot } from './connected-scatterplot.js';
import { overlaidVoices } from './overlaid-voices.js';
import { bubblePlot } from './bubble-plot.js';
import { multiSeriesLine } from './multi-series-line.js';
import { trellisPlot } from './trellis-plot.js';
import { layeredChart } from './layered-chart.js';
import { concatChart } from './concat-chart.js';

/**
 * All gallery examples, in display order.
 * Add a new export here to register it. The `id` field becomes the URL slug.
 * Remember to also add the example to `groups.ts` so it appears in the
 * sidebar and index page.
 */
export const examples: GalleryExample[] = [
  distribution,
  stereoPan,
  seasonalCycle,
  scatterplot,
  connectedScatterplot,
  overlaidVoices,
  bubblePlot,
  multiSeriesLine,
  trellisPlot,
  layeredChart,
  concatChart,
];

export function findExample(id: string): GalleryExample | undefined {
  return examples.find((e) => e.id === id);
}

export type { GalleryExample } from './types.js';
