# Umwelt Editor

## Using Umwelt

The editor is deployed at: https://umwelt-data.github.io/umwelt/editor/

## Available Scripts

In the project directory, you can run:

### `pnpm dev` or `pnpm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>

### `pnpm build`

Builds the app for production to the `dist` folder.<br>

## Deployment

Deployed automatically on push to github pages via the `.github/workflows/deploy.yml` workflow.

# Documentation

The docs render examples through the `umwelt-js` package, so build it first (`pnpm --filter umwelt-js build`, or `pnpm build` at the repo root).

### `pnpm docs:dev`

Runs the docs in dev mode with live reload at [http://localhost:5173](http://localhost:5173).

### `pnpm docs:build`

Builds vitepress docs to `docs/.vitepress/dist`.

### `pnpm docs:preview`

Previews the build output from `docs/.vitepress/dist` at [http://localhost:4173](http://localhost:4173).
