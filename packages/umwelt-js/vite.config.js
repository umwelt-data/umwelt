import { defineConfig } from "vite";
import { resolve } from "path";
import { readFileSync } from "fs";
import solidPlugin from 'vite-plugin-solid';

// npm dependencies stay external (consumers install them via package.json);
// the workspace package umwelt-solid is inlined into the bundle.
const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8"));
const external = Object.keys(pkg.dependencies).map((dep) => new RegExp(`^${dep}(/|$)`));

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
