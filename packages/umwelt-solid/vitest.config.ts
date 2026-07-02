import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: [
      // vega-lite's CJS main entry require()s vega 6's ESM build, which Node
      // rejects; point at vega-lite's ESM build so the graph stays ESM
      { find: /^vega-lite$/, replacement: 'vega-lite/build/src/index.js' },
    ],
  },
  test: {
    environment: 'jsdom',
    server: {
      deps: { inline: [/solid-js/, 'olli', '@umwelt-data/umwelt-utils'] },
    },
  },
});
