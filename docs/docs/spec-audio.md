# Audio Units

The spec's `audio` property holds the sonification side of the representation:

```json
{
  "audio": {
    "units": [ ... ],
    "composition": "concat"
  }
}
```

`units` is an array of audio unit specs. `composition` is optional and only meaningful with more than one unit; it is either `concat` (the default) or `layer` — see [Composition](#composition).

## Audio unit

| Property | Type | Description |
| --- | --- | --- |
| `name` | string | Unique identifier for the unit. |
| `encoding` | object | A map from audio property to encoding field definition. |
| `traversal` | array | Ordered field references defining playback order. |

```json
{
  "name": "audio_unit_0",
  "encoding": { "pitch": { "field": "price" } },
  "traversal": [{ "field": "symbol" }, { "field": "date" }]
}
```

## Encoding properties

| Property | Meaning |
| --- | --- |
| `pitch` | Higher values play higher tones |
| `duration` | Higher values play longer tones |
| `volume` | Higher values play louder tones |

As with visual encodings, each value is a field reference that inherits the field's definition, and may locally override `type`, `aggregate`, `timeUnit`, `scale`, or `sort` (audio encodings can't `bin`). The `"None"` sentinel removes an inherited transform.

## Traversals

A visualization lays data out in space; a sonification lays it out in time. The `traversal` array supplies that ordering: it works like nested loops, outermost field first.

```json
"traversal": [{ "field": "symbol" }, { "field": "date" }]
```

reads as *for each `symbol`, for each `date`, play a tone* — each company's price history in sequence. Reversing the order (`date` outer, `symbol` inner) would instead play every company at each date before advancing, emphasizing comparison at a moment over each company's trend.

Each step of the traversal is a group of data points; the encoded fields are evaluated within that group (this is where an `aggregate` on the encoding matters). Traversal fields may recast their measure `type` or be coarsened with `bin` (quantitative) or `timeUnit` (temporal), but can't be aggregated — they define the steps, not the measures.

In the rendered viewer, each traversal field becomes an interactive control for scrubbing playback — see [Exploring the Viewer](/using/viewer#sonification).

## Composition

With more than one unit, `composition` controls how they relate in the viewer.

- **`concat`** (the default) — units are independent tracks. Each keeps its own traversal, scales, and playback controls, and only one plays at a time.
- **`layer`** — units play *simultaneously* under a single shared traversal and one set of controls, like overlaid series on a shared axis. Layered units share the same traversal field(s); their domains are unioned so one cursor sweeps them together, and a layer falls silent at any step it has no datum for. Each layer sounds on its own timbre so they stay distinguishable, while its encoding scales (`pitch`, `duration`, `volume`) remain independent.

Layered units stay aligned as long as their step durations match (the default when `duration` is unencoded); a layer that encodes `duration` differently from its siblings may drift out of sync over the sequence.

## Next

- [Text Structure](/docs/spec-text) — authoring the description tree.
- [Quickstart](/docs/quickstart) — render a spec with `umwelt-js`.
- [Gallery](/gallery/) — complete specs to hear and remix.
