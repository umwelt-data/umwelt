import type { GalleryExample } from './types.js';
import { multiSeriesLine } from './multi-series-line.js';

/**
 * All gallery examples, in display order.
 * Add a new export here to register it. The `id` field becomes the URL slug.
 * Remember to also add the example to `groups.ts` so it appears in the
 * sidebar and index page.
 */
export const examples: GalleryExample[] = [multiSeriesLine];

export function findExample(id: string): GalleryExample | undefined {
  return examples.find((e) => e.id === id);
}

export type { GalleryExample } from './types.js';
