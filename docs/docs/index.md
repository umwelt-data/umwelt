# Overview & Architecture

Umwelt is a specification-driven system for multimodal data representations. A single **UmweltSpec** describes a dataset, its fields, a key, and a set of visual and audio units; from it, Umwelt renders three coordinated views — a visualization, a keyboard-navigable textual structure, and a sonification. This section covers the developer API and the spec format. If you want to author representations interactively, see [Using Umwelt](/using/) and the [editor](https://umwelt-data.github.io/umwelt/editor/).

## Data flow

1. A spec arrives from the editor, a share URL, or your own code, and its [data source](/docs/spec-data) is resolved (embedded values, a URL, or a built-in example dataset).
2. The **visual units** are compiled to a [Vega-Lite](https://vega.github.io/vega-lite/) specification and rendered as an interactive chart.
3. The spec's structure is converted to an [Olli](https://umwelt-data.github.io/olli/) spec and rendered as an accessible navigation tree.
4. The **audio units** drive a [Tone.js](https://tonejs.github.io/) engine that plays the data in [traversal](/docs/spec-audio#traversals) order.

Selections propagate between the views through the spec's [key](/docs/spec-fields#the-key): navigating the tree highlights marks in the chart, and brushing the chart selects in the tree.

## Packages

| Package | Purpose |
| --- | --- |
| `umwelt-js` | Framework-agnostic embeddable viewer: `createViewer(spec, container)` |
| `umwelt-solid` | SolidJS implementation of the editor and viewer; deployed as the [hosted editor](https://umwelt-data.github.io/umwelt/editor/) |
| `@umwelt-data/umwelt-utils` | Shared utilities (data parsing, predicates, descriptions, Vega-Lite bridge) used by Umwelt and Olli |
| `olli` | Accessible tree-navigation rendering for the textual structure |

## Where to go next

- **Embed the viewer in a page:** Start with the [Quickstart](/docs/quickstart), then read the [Viewer API](/docs/viewer-api).
- **Generate specs programmatically:** Read [UmweltSpec](/docs/spec) and the pages on [data](/docs/spec-data), [fields](/docs/spec-fields), [visual units](/docs/spec-visual), and [audio units](/docs/spec-audio).
- **Link into the editor:** See [Editor Share URLs](/docs/editor-urls) to construct links that open the editor with a spec preloaded.
- **See working specs:** Browse the [gallery](/gallery/) — every example shows its spec and links into the editor.
