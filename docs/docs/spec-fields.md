# Fields & the Key

Umwelt specs are organized around fields. Each entry in the `fields` array describes one column of the dataset; encodings in [visual](/docs/spec-visual) and [audio](/docs/spec-audio) units refer to fields by name and inherit their definitions.

## Field definition

| Property | Type | Description |
| --- | --- | --- |
| `name` | string | The column name in the dataset. Required. |
| `type` | string | Measure type: `nominal`, `ordinal`, `quantitative`, or `temporal`. |
| `aggregate` | string | Summarize the field: `mean`, `median`, `min`, `max`, `sum`, or `count`. Quantitative, non-key fields only. |
| `bin` | boolean | Group continuous values into intervals. |
| `timeUnit` | string | Bucket temporal values: `year`, `quarter`, `month`, `yearmonth`, `day`, `date`, `hours`, `minutes`, or `seconds`. |
| `scale` | object | Scale hints: `domain` (explicit domain values), `zero`, `nice`. |
| `sort` | Vega-Lite sort | Sort order for the field's values. |

Transforms declared on a field are its defaults everywhere the field is encoded. An individual encoding can [override them](/docs/spec-visual#overriding-transforms-per-encoding), including overriding to nothing.

```json
{ "name": "price", "type": "quantitative", "aggregate": "mean" }
```

## The key

`key` is an array of field names whose values jointly identify each data point — a composite primary key:

```json
{ "key": ["symbol", "date"] }
```

The key does structural work throughout Umwelt:

- **Cross-modal alignment.** A selection is a predicate over key values, so the same data point can be highlighted in the chart, focused in the description tree, and located in the sonification's playback order.
- **Defaults.** The editor's default-spec heuristics choose representations based on the shapes of the key and value fields (for example, one temporal key plus one quantitative value suggests a line chart with a pitch sonification).
- **Traversal order.** Audio [traversals](/docs/spec-audio#traversals) typically walk the key fields.

Constraints: key fields identify data points rather than measure them, so a key field can't carry an `aggregate`. A quantitative field may appear in the key only when binned; a temporal one is usually bucketed with a `timeUnit`. The editor [detects the key automatically](/using/fields#the-key); when writing specs by hand, pick the minimal set of fields that makes each record unique.

## Next

- [Visual Units](/docs/spec-visual) — mapping fields to marks and channels.
- [Audio Units](/docs/spec-audio) — mapping fields to sound and time.
