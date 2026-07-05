// Guard: this package must be published with `pnpm publish`, never `npm publish`.
// umwelt-solid is a `workspace:*` devDependency (inlined into the bundle, so it stays
// private) — npm ships that spec literally (invalid), whereas pnpm rewrites it. pnpm
// sets npm_config_user_agent to "pnpm/…"; npm sets it to "npm/…".
const ua = process.env.npm_config_user_agent || '';
if (!ua.startsWith('pnpm')) {
  console.error(
    '\n✖ Publish umwelt-js with `pnpm publish`, not npm.\n' +
      '  umwelt-solid is a workspace:* devDependency; `npm publish` ships it literally,\n' +
      '  `pnpm publish` rewrites it. (Run `pnpm publish` from packages/umwelt-js.)\n'
  );
  process.exit(1);
}
