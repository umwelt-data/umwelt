import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";
import solidPlugin from 'vite-plugin-solid';

export default defineConfig(({ command }) => ({
  publicDir: command === "serve" ? "public" : false,
  server: {
    port: 3000,
  },
  build: {
    emptyOutDir: false,
    target: "esnext",
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs", "umd"],
      name: "umwelt",
      fileName: "index",
    },
  },
  plugins: [solidPlugin(), dts({
    outDir: 'dist',
  })]
}));