/**
 * Gallery example groupings for sidebar navigation and the index page.
 *
 * Lightweight — no heavy imports — so it can be used in VitePress config
 * (Node context) and Vue components (browser context).
 */
export const galleryGroups: { label: string; items: { id: string; title: string }[] }[] = [
  {
    label: 'Line Charts',
    items: [{ id: 'multi-series-line', title: 'Multi-series line chart' }],
  },
];
