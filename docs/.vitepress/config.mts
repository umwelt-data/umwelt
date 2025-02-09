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
      { text: 'Examples', link: '/markdown-examples' },
      { text: 'Editor', link: 'https://umwelt-data.github.io/umwelt/editor' },
    ],

    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/umwelt-data/umwelt' }],
  },
});
