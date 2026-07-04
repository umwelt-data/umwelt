/**
 * Gallery example groupings for sidebar navigation and the index page.
 *
 * Lightweight — no heavy imports — so it can be used in VitePress config
 * (Node context) and Vue components (browser context).
 */
export const galleryGroups: { label: string; items: { id: string; title: string }[] }[] = [
  {
    label: 'Scatter & Bubble Plots',
    items: [
      { id: 'scatterplot', title: 'Scatterplot' },
      { id: 'connected-scatterplot', title: 'Connected scatterplot' },
      { id: 'bubble-plot', title: 'Bubble plot' },
    ],
  },
  {
    label: 'Line Charts',
    items: [{ id: 'multi-series-line', title: 'Multi-series line chart' }],
  },
  {
    label: 'Multi-View Displays',
    items: [
      { id: 'layered-chart', title: 'Layered chart' },
      { id: 'concat-chart', title: 'Concatenated chart' },
      { id: 'trellis-plot', title: 'Trellis plot' },
    ],
  },
];
