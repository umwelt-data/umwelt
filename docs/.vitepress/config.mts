import { defineConfig } from 'vitepress';
import solidPlugin from 'vite-plugin-solid';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  vite: {
    plugins: [solidPlugin()],
  },
  title: 'Umwelt',
  description: 'Accessible multimodal data representations',
  base: '/umwelt/',
  themeConfig: {
    externalLinkIcon: true,
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'User Guide', link: '/user-guide/' },
      { text: 'Examples', link: '/examples/' },
      { text: 'Reference', link: '/reference/' },
      { text: 'Editor', link: 'https://umwelt-data.github.io/umwelt/editor' },
    ],

    sidebar: {
      '/user-guide/': [
        {
          text: 'User Guide',
          items: [
            { text: 'Getting Started', link: '/user-guide/' },
            { text: 'Uploading Data', link: '/user-guide/uploading-data' },
            { text: 'Configuring Fields', link: '/user-guide/configuring-fields' },
            { text: 'Creating Visualizations', link: '/user-guide/creating-visualizations' },
            { text: 'Creating Sonifications', link: '/user-guide/creating-sonifications' },
            { text: 'Viewer Interface', link: '/user-guide/viewer-interface' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples & Tutorials',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Stocks', link: '/examples/stocks' },
            { text: 'Basic Chart', link: '/examples/basic-chart' },
            { text: 'Time Series', link: '/examples/time-series' },
            { text: 'Multivariate Data', link: '/examples/multivariate' },
            { text: 'Categorical Data', link: '/examples/categorical' },
            { text: 'Advanced Sonification', link: '/examples/advanced-sonification' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Developer Reference',
          items: [
            { text: 'Overview', link: '/reference/' },
            { text: 'UmweltSpec', link: '/reference/umwelt-spec' },
            { text: 'Field Definitions', link: '/reference/field-definitions' },
            { text: 'Visual Encodings', link: '/reference/visual-encodings' },
            { text: 'Audio Encodings', link: '/reference/audio-encodings' },
            { text: 'Data Types', link: '/reference/data-types' },
            { text: 'Contexts', link: '/reference/contexts' },
          ],
        },
      ],
      '/integration/': [
        {
          text: 'Integration',
          items: [
            { text: 'Overview', link: '/integration/' },
            { text: 'Embedding Umwelt', link: '/integration/embedding' },
            { text: 'Custom Datasets', link: '/integration/custom-datasets' },
            { text: 'Export & Import', link: '/integration/export-import' },
            { text: 'Extending Umwelt', link: '/integration/extending' },
          ],
        },
      ],
      '/concepts/': [
        {
          text: 'Concepts',
          items: [
            { text: 'Overview', link: '/concepts/' },
            { text: 'Multimodal Design', link: '/concepts/multimodal-design' },
            { text: 'Data Sonification', link: '/concepts/data-sonification' },
            { text: 'Accessibility First', link: '/concepts/accessibility-first' },
            { text: 'Specification Driven', link: '/concepts/specification-driven' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/umwelt-data/umwelt' }],
  },
});
