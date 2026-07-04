#!/usr/bin/env node
// Headless-Chrome driver for the umwelt editor app.
// See SKILL.md in this directory for usage. Requires `npm install` in this
// directory (puppeteer-core) and a running dev server (`pnpm dev` in
// packages/umwelt-solid).
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const APP_URL = process.env.UMWELT_URL ?? 'http://localhost:3000/umwelt/editor/';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = process.env.UMWELT_SHOT_DIR ?? '.';

const [, , command = 'smoke', ...args] = process.argv;

if (!existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME}. Set CHROME_PATH.`);
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 1200 });
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console.error] ${m.text().slice(0, 300)}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message.slice(0, 300)}`));

const shot = async (name) => {
  const path = `${OUT_DIR}/umwelt-${name}.png`;
  await page.screenshot({ path });
  console.log(`screenshot: ${path}`);
};

// The app auto-loads stocks.csv (fetched from vega-datasets on github) and
// renders chart (#vl-container canvas) + olli tree (#olli-container).
const load = async () => {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#vl-container canvas', { timeout: 45000 });
  await sleep(1500);
  console.log('chart canvas:', !!(await page.$('#vl-container canvas')));
  console.log('olli tree:', !!(await page.$('#olli-container [role=tree]')));
};

// Only the currently-focused treeitem has tabindex="0"; the ul[role=tree]
// itself is not focusable.
const focusTree = () =>
  page.evaluate(() => document.querySelector('#olli-container [role=treeitem][tabindex="0"]')?.focus());

const navTree = async (keys) => {
  await focusTree();
  for (const key of keys) {
    await page.keyboard.press(key);
    await sleep(300);
  }
  await sleep(600);
  console.log(
    'focused node:',
    await page.evaluate(() => document.activeElement?.textContent?.slice(0, 120)),
  );
};

// Brush updates are gated on mouseenter and debounced 250ms — move onto the
// canvas first, then drag, then wait.
const brush = async () => {
  const canvas = await page.$('#vl-container canvas');
  if (!canvas) return console.log('brush: no canvas');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3, { steps: 5 });
  await sleep(200);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.7, { steps: 10 });
  await page.mouse.up();
  await sleep(800);
  console.log(
    'olli root after brush:',
    await page.evaluate(() => document.querySelector('#olli-container')?.textContent?.slice(0, 160)),
  );
};

// Example datasets are radio inputs, not buttons. Some datasets (cars.json,
// weather.csv, gapminder.json, penguins.json) legitimately render no chart —
// heuristics produce no visual units, so only a data-only olli tree appears.
const switchDataset = async (name) => {
  const clicked = await page.evaluate(
    (n) => {
      const radio = document.querySelector(`input[name="example_datasets"][value="${n}"]`);
      if (radio) {
        radio.click();
        return true;
      }
      return false;
    },
    name,
  );
  if (!clicked) return console.log(`dataset radio not found: ${name}`);
  await sleep(6000);
  console.log(
    name,
    await page.evaluate(() => ({
      canvas: !!document.querySelector('#vl-container canvas'),
      olli: document.querySelector('#olli-container')?.textContent?.slice(0, 100),
    })),
  );
};

const reportErrors = () => {
  const interesting = errors.filter((l) => !/AudioContext|favicon/i.test(l));
  console.log('errors:', interesting.length ? '\n' + interesting.join('\n') : '(none)');
  return interesting.length;
};

// End-to-end regression for cross-view selection coordination: brushing the
// scatterplot must filter BOTH the olli tree and the sonification traversal
// domain, with no thrown errors. Guards three fixes at once:
//   - vl-bridge normalizes inverted-scale (descending) brush ranges to ascending
//   - getDomainValue degrades gracefully on an empty selection (no throw)
//   - textualStructure suppresses olli's refocus so it can't clear the selection
// Loads a fixed scatterplot spec via the editor's #spec= share link.
const SCATTER_SPEC = {
  data: { name: 'cars.json', url: 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/cars.json' },
  fields: [
    { name: 'Miles_per_Gallon', type: 'quantitative' },
    { name: 'Horsepower', type: 'quantitative' },
    { name: 'Origin', type: 'nominal' },
  ],
  key: [],
  visual: { units: [{ name: 'vis_unit_0', mark: 'point', encoding: { x: { field: 'Miles_per_Gallon' }, y: { field: 'Horsepower' }, color: { field: 'Origin' } } }] },
  audio: {
    units: [
      { name: 'audio_unit_0', encoding: { pitch: { field: 'Miles_per_Gallon', aggregate: 'mean' } }, traversal: [{ field: 'Horsepower', bin: true }] },
      { name: 'audio_unit_1', encoding: { pitch: { field: 'Horsepower', aggregate: 'mean' } }, traversal: [{ field: 'Miles_per_Gallon', bin: true }] },
    ],
    composition: 'concat',
  },
};

const readCoordination = () =>
  page.evaluate(() => ({
    olli: document.querySelector('#olli-container')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    // sonification playback descriptions carry the traversal domain extent
    son: [...document.querySelectorAll('.uw-viewer p')]
      .map((p) => p.textContent.replace(/\s+/g, ' ').trim())
      .filter((t) => /playing binned/.test(t)),
  }));

const regress = async () => {
  const { default: LZString } = await import('../../../packages/umwelt-solid/node_modules/lz-string/libs/lz-string.js');
  const url = `${APP_URL}#spec=${LZString.compressToEncodedURIComponent(JSON.stringify(SCATTER_SPEC))}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#vl-container canvas', { timeout: 45000 });
  await sleep(2500);

  const before = await readCoordination();
  await brush();
  await sleep(700);
  const after = await readCoordination();

  const checks = [
    ['olli tree filtered by brush', before.olli !== after.olli && after.olli.length > 0],
    ['sonification domain filtered by brush', before.son.length > 0 && JSON.stringify(before.son) !== JSON.stringify(after.son)],
  ];
  let fails = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
    if (!ok) fails++;
  }
  if (fails) {
    console.log('before:', JSON.stringify(before));
    console.log('after :', JSON.stringify(after));
  }
  return fails;
};

let failed = 0;
try {
  switch (command) {
    case 'smoke':
      await load();
      await shot('smoke');
      break;
    case 'interact':
      await load();
      await shot('initial');
      await navTree(['ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowDown']);
      await shot('tree-nav'); // chart should show dimming + highlighted marks
      await brush();
      await shot('brush');
      break;
    case 'dataset':
      await load();
      await switchDataset(args[0] ?? 'cars.json');
      await shot(`dataset-${(args[0] ?? 'cars.json').replace(/\W/g, '_')}`);
      break;
    case 'eval':
      await load();
      console.log(await page.evaluate(args[0]));
      break;
    case 'regress':
      failed += await regress();
      await shot('regress');
      break;
    default:
      console.error(`unknown command: ${command} (expected smoke | interact | dataset <name> | eval "<js>" | regress)`);
      failed = 1;
  }
  failed = reportErrors() ? 1 : failed;
} finally {
  await browser.close();
}
process.exit(failed);
