import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: [
      // vega-lite's CJS main entry require()s vega 6's ESM build, which Node
      // rejects; point at vega-lite's ESM build so the graph stays ESM.
      // Absolute path so the rewrite stays valid for imports coming from
      // linked packages (e.g. olli's dist) whose own vega-lite differs.
      { find: /^vega-lite$/, replacement: fileURLToPath(new URL('./node_modules/vega-lite/build/src/index.js', import.meta.url)) },
    ],
  },
  test: {
    environment: 'jsdom',
    server: {
      deps: { inline: [/solid-js/, 'olli', '@umwelt-data/umwelt-utils'] },
    },
  },
});
