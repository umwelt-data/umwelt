# Editor Share URLs

The [editor](https://umwelt-data.github.io/umwelt/editor/) can be opened with a spec preloaded, which is how the editor's Export tab, the [gallery](/gallery/)'s "Open in editor" links, and any integration of your own can hand a representation to a user for remixing.

## Format

The spec is JSON-stringified, compressed with [lz-string](https://github.com/pieroxy/lz-string)'s `compressToEncodedURIComponent`, and placed in the URL's **hash fragment**:

```
https://umwelt-data.github.io/umwelt/editor/#spec=<compressed>
```

Because the spec travels in the fragment, it is never sent to the server. On load, the editor decodes the spec, resolves its data source, and strips the parameter from the address bar.

## Constructing a link

```ts
import LZString from 'lz-string';

const EDITOR_URL = 'https://umwelt-data.github.io/umwelt/editor/';

function editorLink(spec) {
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(spec));
  return `${EDITOR_URL}#spec=${compressed}`;
}
```

The spec is the same [exportable format](/docs/spec) used everywhere else.

## Keeping links short

Link length is dominated by the data source:

- A [`url` or name-only data source](/docs/spec-data) keeps links short — the data is fetched when the editor opens.
- A `values` data source embeds the entire dataset in the link. This makes links self-contained but potentially very long; past roughly 8,000 characters, some chat apps and servers truncate URLs. Prefer hosting the data at a URL when sharing large datasets.

## Next

- [UmweltSpec](/docs/spec) — the spec format the link carries.
- [Data](/docs/spec-data) — the three data source forms.
