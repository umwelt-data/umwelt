---
name: run-umwelt
description: Run, screenshot, and drive the umwelt editor web app end-to-end — start the vite dev server and interact with the chart, olli tree, and sonification UI via a headless-Chrome driver. Use when asked to run/start/launch umwelt, take a screenshot, or verify UI behavior in the real app.
---

# Run umwelt

Umwelt is a Solid web app (`packages/umwelt-solid`) served by vite. Drive it with
`.claude/skills/run-umwelt/driver.mjs` — a puppeteer-core script that uses the
system Chrome (no browser download). All paths below are relative to the repo root.

## Prerequisites

```bash
pnpm install                                      # workspace deps (repo root)
npm install --prefix .claude/skills/run-umwelt    # driver dep (puppeteer-core), once
```

Requires Google Chrome at `/Applications/Google Chrome.app` (override with
`CHROME_PATH`). The app fetches example datasets from
`raw.githubusercontent.com` on load, so it needs network.

## Run (agent path)

Start the dev server in the background, then run the driver:

```bash
cd packages/umwelt-solid && pnpm dev   # serves http://localhost:3000/umwelt/editor/
```

```bash
node .claude/skills/run-umwelt/driver.mjs smoke            # load, verify chart + olli tree render
node .claude/skills/run-umwelt/driver.mjs interact         # + keyboard-nav olli tree (chart dims/highlights), brush drag (olli updates)
node .claude/skills/run-umwelt/driver.mjs dataset cars.json  # switch example dataset
node .claude/skills/run-umwelt/driver.mjs eval "document.title"
node .claude/skills/run-umwelt/driver.mjs regress          # E2E regression: brush a scatterplot, assert olli + sonification filter, no errors
```

`regress` is the end-to-end guard for cross-view selection coordination (also
runnable as `pnpm --filter umwelt-solid test:e2e`). It loads a fixed scatterplot
spec via the editor's `#spec=` share link, brushes a sub-region, and asserts the
olli tree AND the sonification traversal domain both filter, with no thrown
errors. It exits nonzero (PASS/FAIL per check) if the brush→olli→sonification
wiring regresses. Needs the dev server running, like the other commands.

Screenshots land in `.claude/skills/run-umwelt/screenshots/` (gitignored) as
`umwelt-<step>.png` (override dir with `UMWELT_SHOT_DIR`). The driver exits
nonzero if console/page errors were collected (AudioContext warnings are
filtered — expected headless).

What a healthy `interact` run shows: `umwelt-tree-nav.png` has the chart dimmed
with the tree-focused subset highlighted; the brush step prints an olli root
label like `date is between <a> and <b>. N values.`

## Run (human path)

`cd packages/umwelt-solid && pnpm dev`, open `http://localhost:3000/umwelt/editor/`.

## Test / build

```bash
cd packages/umwelt-solid && pnpm vitest run   # unit tests (jsdom; canvas warning is noise)
cd packages/umwelt-solid && pnpm build        # vite production build
```

## Gotchas

- **`504 (Outdated Optimize Dep)` + blank page**: vite's dep cache is stale.
  Kill the server first, then `rm -rf packages/umwelt-solid/node_modules/.vite`,
  then restart. Deleting the cache while the server runs makes it worse.
- **Olli tree keyboard nav**: focus `.uw-olli-container [role=treeitem][tabindex="0"]`
  — only the focused treeitem is focusable; the `ul[role=tree]` is not, and
  `focus()` on it silently leaves focus on `<body>`.
- **Example datasets are radios**, `input[name="example_datasets"][value="stocks.csv"]`,
  in the Data tab — not buttons.
- **No chart ≠ failure for some datasets**: cars.json, weather.csv,
  gapminder.json, penguins.json produce no default visual units by design; you
  get a data-only olli tree ("A dataset. N children.") and no canvas.
- **Brush**: writes are gated on `mouseenter` and debounced 250ms — move the
  mouse onto the canvas before `mousedown`, wait ~800ms after `mouseup`.
- **Multi-view specs**: Visual tab → "Add visual unit"; the composition
  `<select>` (layer/concat) is at the bottom of that tab. Vega renders
  multi-view specs on a single canvas — don't count canvases to detect it.
- **Stray headless Chrome**: a crashed run can leave a headless Chrome that
  makes the next launch hang. `pkill -f "Google Chrome.*headless"`.
- The app persists dataset cache + recent files in localStorage; a fresh
  headless profile starts clean and re-fetches stocks.csv.

## Troubleshooting

- `TimeoutError: Waiting for selector '.uw-vl-container canvas'` on first load →
  the 504/stale-cache gotcha above, or the dev server isn't running.
- Driver exits 1 with `[console.error] Failed to load resource ... 504` →
  same stale-cache fix.
