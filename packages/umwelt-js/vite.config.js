import { defineConfig } from "vite";
import { resolve } from "path";
import { readFileSync } from "fs";
import solidPlugin from 'vite-plugin-solid';

// npm dependencies stay external (consumers install them via package.json);
// the workspace package umwelt-solid is inlined into the bundle.
const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8"));
const depPatterns = Object.keys(pkg.dependencies).map((dep) => new RegExp(`^${dep}(/|$)`));
// CSS imported from a dependency (notably `olli/styles.css`) is bundled into our
// single `dist/index.css`, not externalized — otherwise it survives only as a JS
// side-effect `import 'olli/styles.css'`, which leaves `umwelt-js/style.css`
// missing the description tree's styles and breaks CDN builds (e.g. esm.sh
// `?bundle`) that strip CSS-as-module imports. Consumers get all viewer styling
// from one `import 'umwelt-js/style.css'`.
const external = (id) =>
  !id.endsWith(".css") && depPatterns.some((re) => re.test(id));

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external,
    },
  },
  plugins: [
    solidPlugin(),
  ],
});
