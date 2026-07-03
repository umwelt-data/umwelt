# Viewer API

`umwelt-js` exposes a small, framework-agnostic API for mounting the Umwelt viewer. Internally it renders with SolidJS, but you never touch that — you hand it a spec and a container element.

## `createViewer(spec, container)`

```ts
import { createViewer } from 'umwelt-js';
import 'umwelt-js/style.css';

const viewer = createViewer(spec, document.getElementById('umwelt-viewer'));
```

Creates and mounts a viewer, returning an `UmweltViewer` instance. The `spec` is an [UmweltSpec](/docs/spec); the container is any `HTMLElement`. Data resolution is asynchronous — the viewer renders as soon as the spec's [data source](/docs/spec-data) resolves.

Import `umwelt-js/style.css` once per page; it contains the viewer's layout and the styles for the description tree.

## `UmweltViewer`

| Method | Description |
| --- | --- |
| `updateSpec(newSpec)` | Replace the specification. Re-renders the entire viewer with the new data and configuration. |
| `getSpec()` | Returns the current spec. |
| `getContainer()` | Returns the container element. |
| `destroy()` | Unmounts the viewer and cleans up all resources. The instance can't be reused afterward — calling `updateSpec` on a destroyed viewer throws. |
| `getIsDestroyed()` | Whether `destroy()` has been called. |

Call `destroy()` before removing the container from the DOM (for example, in your framework's unmount hook) so audio and event resources are released.

## Exported types

For TypeScript users, `umwelt-js` re-exports the types you need to construct specs and data:

```ts
import type { UmweltSpec, UmweltDataset, UmweltDatum, UmweltValue } from 'umwelt-js';
```

`UmweltSpec` is the exportable spec format documented in [UmweltSpec](/docs/spec). `UmweltDataset` is an array of `UmweltDatum` records, whose values (`UmweltValue`) are strings, numbers, booleans, or dates.

## Next

- [UmweltSpec](/docs/spec) — what goes in the spec.
- [Quickstart](/docs/quickstart) — a complete working page.
