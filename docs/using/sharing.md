# Sharing & Export

Everything you author in the editor is captured in a compact specification — a JSON description of the data source, fields, key, and visual and audio units. The **Export** tab turns that spec into things you can share.

## Shareable editor URL

The **Shareable Editor URL** field holds a link that reopens the editor with your exact spec loaded. Press **Copy URL** to put it on the clipboard. The spec travels in the URL's hash fragment, so it is never sent to a server.

How your data travels depends on how you loaded it:

- **Loaded from a URL or an example dataset** — the link stores just the data's address, and stays short.
- **Uploaded from a file** — the full dataset is embedded in the link so recipients can open it. The editor warns you when a link grows long enough (roughly 8,000 characters) that chat apps may truncate it; if that happens, consider hosting the data at a URL and loading it from there instead.

## The spec

Below the URL, the **Spec** area shows the specification as JSON. This is the durable form of your work: save it in a file or version control, regenerate it programmatically, or hand it to [`umwelt-js`](/docs/quickstart) to embed the viewer — visualization, description, and sonification — in your own web page.

The spec format is documented in the [developer reference](/docs/spec).

## Next

- [Developer quickstart](/docs/quickstart) — render a spec in your own site.
- [Gallery](/gallery/) — examples with their specs, each openable in the editor.
