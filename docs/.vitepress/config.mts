import { defineConfig } from 'vitepress';
import { galleryGroups } from '../gallery/examples/groups.js';

export default defineConfig({
  title: 'Umwelt',
  description: 'An accessible editor for multimodal data representations: visualization, sonification, and structured text.',
  base: '/umwelt/',
  cleanUrls: true,
  lastUpdated: true,
  lang: 'en-US',
  appearance: false,

  vite: {
    // vega-canvas probes for the native `canvas` module with a top-level
    // `await import('canvas')` (it gracefully no-ops when absent). We never ship
    // canvas: the gallery renders umwelt-js client-side only. Externalize it so
    // neither the client nor SSR bundle tries to resolve it, and target esnext
    // so the leftover top-level await is allowed (matches the editor build).
    build: {
      target: 'esnext',
      rollupOptions: { external: ['canvas'] },
    },
    ssr: { external: ['canvas'] },
  },

  ignoreDeadLinks: [
    // Dynamic gallery routes are generated at build time from [id].paths.ts;
    // the link checker can't see them.
    /^\/gallery\/[^/]+$/,
  ],

  themeConfig: {
    externalLinkIcon: true,

    nav: [
      { text: 'Using Umwelt', link: '/using/', activeMatch: '/using/' },
      { text: 'Developer Docs', link: '/docs/', activeMatch: '/docs/' },
      { text: 'Gallery', link: '/gallery/', activeMatch: '/gallery/' },
      { text: 'Editor', link: 'https://umwelt-data.github.io/umwelt/editor/' },
    ],

    sidebar: {
      '/using/': [
        {
          text: 'Using Umwelt',
          items: [
            { text: 'Getting Started', link: '/using/' },
            { text: 'Loading Data', link: '/using/data' },
            { text: 'Configuring Fields', link: '/using/fields' },
            { text: 'Designing Visualizations', link: '/using/visual' },
            { text: 'Designing Sonifications', link: '/using/audio' },
            { text: 'Designing Text Descriptions', link: '/using/text' },
            { text: 'Exploring the Viewer', link: '/using/viewer' },
            { text: 'Sharing & Export', link: '/using/sharing' },
          ],
        },
      ],
      '/docs/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/docs/' },
            { text: 'Quickstart', link: '/docs/quickstart' },
          ],
        },
        {
          text: 'API Reference',
          items: [
            { text: 'Viewer API', link: '/docs/viewer-api' },
            { text: 'Editor Share URLs', link: '/docs/editor-urls' },
          ],
        },
        {
          text: 'Specification',
          items: [
            { text: 'UmweltSpec', link: '/docs/spec' },
            { text: 'Data', link: '/docs/spec-data' },
            { text: 'Fields & the Key', link: '/docs/spec-fields' },
            { text: 'Visual Units', link: '/docs/spec-visual' },
            { text: 'Audio Units', link: '/docs/spec-audio' },
            { text: 'Text Structure', link: '/docs/spec-text' },
          ],
        },
      ],
      '/gallery/': [
        { text: 'Gallery', link: '/gallery/' },
        ...galleryGroups.map((g) => ({
          text: g.label,
          items: g.items.map((ex) => ({ text: ex.title, link: `/gallery/${ex.id}/` })),
        })),
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/umwelt-data/umwelt' }],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/umwelt-data/umwelt/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      copyright: 'Copyright © 2023-present the Umwelt contributors',
    },
  },
});
