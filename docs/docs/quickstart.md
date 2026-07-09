# Quickstart

Render a complete Umwelt viewer — visualization, textual structure, and sonification — from a spec.

## Install

```bash
npm install umwelt-js
```

## One-file example

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Umwelt quickstart</title>
  </head>
  <body>
    <div id="umwelt-viewer"></div>

    <script type="module">
      import { createViewer } from 'umwelt-js';
      import 'umwelt-js/style.css';

      const spec = {
        data: {
          name: 'stocks.csv',
          url: 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/stocks.csv',
        },
        fields: [
          { name: 'symbol', type: 'nominal' },
          { name: 'date', type: 'temporal' },
          { name: 'price', type: 'quantitative' },
        ],
        key: ['symbol', 'date'],
        visual: {
          units: [
            {
              mark: 'line',
              encoding: {
                x: { field: 'date' },
                y: { field: 'price' },
                color: { field: 'symbol' },
              },
            },
          ],
        },
        audio: {
          units: [
            {
              encoding: { pitch: { field: 'price' } },
              traversal: [{ field: 'symbol' }, { field: 'date' }],
            },
          ],
        },
      };

      createViewer(spec, document.getElementById('umwelt-viewer'));
    </script>
  </body>
</html>
```

Open it in a browser. The viewer fetches the stocks data, renders a multi-series line chart, an accessible description tree beneath it, and sonification controls — press Play (or `p`) to hear each company's prices as pitch.

## What you just did

1. You wrote an [UmweltSpec](/docs/spec): a data source, field definitions, a key, one visual unit, and one audio unit.
2. `createViewer` resolved the data, compiled the visual unit to Vega-Lite, built the Olli navigation tree, and set up the audio engine — returning an [`UmweltViewer`](/docs/viewer-api) handle for updating the spec or tearing down.

You don't have to write specs by hand: author one in the [editor](https://umwelt-data.github.io/umwelt/editor/) and copy the JSON from its Export tab, or start from a [gallery example](/gallery/).

## Next

- [Viewer API](/docs/viewer-api) — the `UmweltViewer` handle.
- [UmweltSpec](/docs/spec) — the full specification format.
- [Editor Share URLs](/docs/editor-urls) — link users into the editor with a spec preloaded.
