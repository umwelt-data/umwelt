# umwelt-js

Embed the [Umwelt](https://umwelt-data.github.io/umwelt/) viewer in any web app. From a single
spec, `umwelt-js` renders three coordinated views of a dataset — a **visualization**, a
**sonification**, and an accessible, keyboard-navigable **textual structure** (powered by
[Olli](https://umwelt-data.github.io/olli/)). It renders internally with SolidJS, but you never
touch that: you hand it a spec and a container element.

## Install

```bash
npm install umwelt-js
```

## Usage

```js
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
        name: 'vis_unit_0',
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
        name: 'audio_unit_0',
        encoding: { pitch: { field: 'price' } },
        traversal: [{ field: 'symbol' }, { field: 'date' }],
      },
    ],
  },
};

const viewer = createViewer(spec, document.getElementById('umwelt-viewer'));
```

Import `umwelt-js/style.css` once per page. You don't have to write specs by hand — author one in
the [editor](https://umwelt-data.github.io/umwelt/editor/) and copy the JSON from its Export tab,
or start from a [gallery example](https://umwelt-data.github.io/umwelt/gallery/).

## API

`createViewer(spec, container)` mounts the viewer and returns an `UmweltViewer`:

| Method | Description |
| --- | --- |
| `updateSpec(newSpec)` | Replace the spec and re-render. |
| `getSpec()` | The current spec. |
| `getContainer()` | The container element. |
| `destroy()` | Unmount and release audio/event resources. The instance can't be reused afterward. |
| `getIsDestroyed()` | Whether `destroy()` has been called. |

Call `destroy()` before removing the container from the DOM (e.g. in your framework's unmount
hook). TypeScript users can import the spec/data types:

```ts
import type { UmweltSpec, UmweltDataset, UmweltDatum, UmweltValue } from 'umwelt-js';
```

## Documentation

- [Quickstart](https://umwelt-data.github.io/umwelt/docs/quickstart)
- [Viewer API](https://umwelt-data.github.io/umwelt/docs/viewer-api)
- [UmweltSpec reference](https://umwelt-data.github.io/umwelt/docs/spec)

## License

BSD-3-Clause © the Umwelt contributors. See [LICENSE](./LICENSE).
