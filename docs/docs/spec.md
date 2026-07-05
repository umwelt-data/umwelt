# UmweltSpec

An UmweltSpec is a declarative description of a multimodal data representation. It's what the editor authors, what share URLs carry, and what [`createViewer`](/docs/viewer-api) renders. This page covers the top level; the linked pages document each part.

## Top-level properties

| Property | Type | Description |
| --- | --- | --- |
| `data` | object | Where the data comes from: embedded values, a URL, or a built-in dataset name. See [Data](/docs/spec-data). |
| `fields` | array | Definitions for each field in use: name, measure type, and optional transforms. See [Fields & the Key](/docs/spec-fields). |
| `key` | array of strings | Field names whose values jointly identify each data point. See [The key](/docs/spec-fields#the-key). |
| `visual` | object | Visual units and, optionally, how to compose them. See [Visual Units](/docs/spec-visual). |
| `audio` | object | Audio units and, optionally, how to compose them. See [Audio Units](/docs/spec-audio). |
| `text` | object | Optional authored structure for the description tree, per view. Omitted when the default inferred structure is used. See [Text Structure](/docs/spec-text). |

## Example

The multi-series line chart from the [gallery](/gallery/multi-series-line): stock prices as a line chart and a per-company pitch sonification.

```json
{
  "data": {
    "name": "stocks.csv",
    "url": "https://raw.githubusercontent.com/vega/vega-datasets/master/data/stocks.csv"
  },
  "fields": [
    { "name": "symbol", "type": "nominal" },
    { "name": "date", "type": "temporal" },
    { "name": "price", "type": "quantitative" }
  ],
  "key": ["symbol", "date"],
  "visual": {
    "units": [
      {
        "name": "vis_unit_0",
        "mark": "line",
        "encoding": {
          "x": { "field": "date" },
          "y": { "field": "price" },
          "color": { "field": "symbol" }
        }
      }
    ]
  },
  "audio": {
    "units": [
      {
        "name": "audio_unit_0",
        "encoding": { "pitch": { "field": "price" } },
        "traversal": [{ "field": "symbol" }, { "field": "date" }]
      }
    ]
  }
}
```

Notice that the spec is organized around **fields**: `price` is defined once and referenced from both the y-axis and the pitch encoding. The visual and audio units are peers that draw on the same field definitions, which is what keeps the modalities consistent.

## Elaboration and defaults

Specs are written in a terse *exportable* form; Umwelt elaborates them on load:

- `visual.composition` and `audio.composition` are optional and only meaningful with multiple units. They default to `layer` (visual) and `concat` (audio).
- If `data.name` is omitted, a name is derived from the URL's filename.
- Unit `name`s are how encodings and compositions refer to units; the `vis_unit_0` / `audio_unit_0` convention comes from the editor, but any unique strings work.

A spec must have a resolvable `data` source and a non-empty `fields` array; otherwise the viewer renders nothing.

## Next

- [Data](/docs/spec-data)
- [Fields & the Key](/docs/spec-fields)
- [Visual Units](/docs/spec-visual)
- [Audio Units](/docs/spec-audio)
- [Text Structure](/docs/spec-text)
