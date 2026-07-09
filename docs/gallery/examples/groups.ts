/**
 * Gallery example groupings for sidebar navigation and the index page.
 *
 * The gallery is organized by the *structure of the data* — how many
 * dimensions you group and traverse by, and how many measures you read off —
 * rather than by chart type. That framing is modality-neutral: a data shape
 * determines the space of encodings across the visualization, the sonification,
 * and the text structure at once, so the same grouping serves all three. Each
 * example additionally carries `tags` (see types.ts) that reground it in the
 * familiar chart vocabulary and describe what its sonification and text sound
 * and read like.
 *
 * Lightweight — no heavy imports — so it can be used in VitePress config
 * (Node context) and Vue components (browser context).
 */
export const galleryGroups: { label: string; blurb: string; items: { id: string; title: string }[] }[] = [
  {
    label: 'One measure over one dimension',
    blurb:
      'The simplest shape: a single quantity read along one axis.',
    items: [
      { id: 'distribution', title: 'Distribution' },
      { id: 'stereo-pan', title: 'Stereo panning' },
      { id: 'seasonal-cycle', title: 'Seasonal cycle' },
    ],
  },
  {
    label: 'Relating two measures',
    blurb:
      'Two quantities read against each other. The visualization places one on each spatial axis; the sonification can traverse them one after another, or play them at the same time with two distinct voices.',
    items: [
      { id: 'scatterplot', title: 'Scatterplot' },
      { id: 'connected-scatterplot', title: 'Connected scatterplot' },
      { id: 'overlaid-voices', title: 'Overlaid voices' },
    ],
  },
  {
    label: 'One measure over nested dimensions',
    blurb:
      'One quantity broken down by two or more grouping dimensions. Nesting shows up in every modality: faceted panels, a grouped text tree, and a traversal that steps through each level in order.',
    items: [
      { id: 'bubble-plot', title: 'Bubble plot' },
      { id: 'multi-series-line', title: 'Multi-series line chart' },
      { id: 'trellis-plot', title: 'Trellis plot' },
    ],
  },
  {
    label: 'Composed views',
    blurb:
      'Specifications that combine several views. Each view is its own visual and audio unit, composed by layering or concatenation.',
    items: [
      { id: 'layered-chart', title: 'Layered chart' },
      { id: 'concat-chart', title: 'Concatenated chart' },
    ],
  },
];
