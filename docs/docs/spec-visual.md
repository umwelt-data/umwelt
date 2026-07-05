# Visual Units

The spec's `visual` property holds the visualization side of the representation:

```json
{
  "visual": {
    "units": [ ... ],
    "composition": "layer"
  }
}
```

`units` is an array of visual unit specs; `composition` is optional and only meaningful with more than one unit.

## Visual unit

| Property | Type | Description |
| --- | --- | --- |
| `name` | string | Unique identifier; how field encodings and the editor refer to this unit. |
| `mark` | string | `point`, `line`, `bar`, or `area`. |
| `encoding` | object | A map from visual property to encoding field definition. |

```json
{
  "name": "vis_unit_0",
  "mark": "line",
  "encoding": {
    "x": { "field": "date" },
    "y": { "field": "price" },
    "color": { "field": "symbol" }
  }
}
```

## Encoding properties

| Property | Meaning |
| --- | --- |
| `x`, `y` | Position |
| `color` | Hue |
| `shape` | Point shape |
| `size` | Mark size |
| `opacity` | Mark opacity |
| `order` | Drawing order |
| `facet` | Small multiples by category |

Each encoding value is a field reference: `{ "field": "price" }`. The field's `type` and transforms come from its [field definition](/docs/spec-fields) — encodings don't repeat them.

## Overriding transforms per encoding

An encoding may override the field's transforms locally with `type`, `aggregate`, `bin`, `timeUnit`, `scale`, or `sort` properties of its own. `type` recasts the field's measure type for this channel only — for example, rendering a temporal field as a nominal color scale. The sentinel string `"None"` explicitly removes a field-level transform for this encoding only:

```json
{
  "y": { "field": "price", "aggregate": "None" }
}
```

Here `price` might default to `mean` in its field definition, but this unit plots the raw values.

## Composition

With multiple units, `composition` chooses how they combine:

- `"layer"` (default) — draw units in a single view, on top of each other.
- `"concat"` — place units side by side as separate views.

Units remain coordinated through the shared [key](/docs/spec-fields#the-key) regardless of composition.

## Next

- [Audio Units](/docs/spec-audio) — the sonification counterpart.
