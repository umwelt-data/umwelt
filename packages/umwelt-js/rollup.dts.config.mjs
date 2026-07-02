import { dts } from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

// Flatten the declaration tree emitted by `tsc -p tsconfig.dts.json` into a
// single self-contained dist/index.d.ts: umwelt-solid's types are inlined,
// npm dependencies' types stay external (same split as the JS bundle).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies).map((dep) => new RegExp(`^${dep}(/|$)`));

export default {
  input: 'dist-dts/umwelt-js/src/index.d.ts',
  output: { file: 'dist/index.d.ts', format: 'es' },
  plugins: [
    dts({
      tsconfig: 'tsconfig.dts.json',
      compilerOptions: {
        paths: {
          'umwelt-solid': ['./dist-dts/umwelt-solid/src/lib.d.ts'],
        },
      },
    }),
  ],
  external,
};
