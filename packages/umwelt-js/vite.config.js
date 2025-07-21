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
    rollupOptions: {
      external: [], // Bundle SolidJS and dependencies
      output: {
        globals: {
          // No externals to define since we're bundling everything
        }
      }
    }
  },
  plugins: [
    solidPlugin(), 
    dts({
      outDir: 'dist',
      entryRoot: 'src',
      include: ['src/**/*'],
      exclude: ['**/*.test.*', '**/*.spec.*']
    })
  ],
  resolve: {
    alias: {
      // Ensure we can resolve the umwelt-solid package during development
      "../../umwelt-solid/src": resolve(__dirname, "../umwelt-solid/src")
    }
  }
}));