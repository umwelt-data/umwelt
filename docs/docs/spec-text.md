# Text Structure

The spec's `text` property authors the structure of the description that [Olli](https://umwelt-data.github.io/olli/) renders — the keyboard- and screen-reader-navigable tree. It is **optional**: when absent, each view keeps the structure Umwelt infers from the chart (or, with no chart, from the fields). When present, it overrides the inferred structure for the views it names.

```json
{
  "text": {
    "structures": {
      "vis_unit_0": [ ... ]
    }
  }
}
```

## Structures

`structures` maps a **structure key** to an array of nodes:

- A **visual unit name** — the description of that chart view. It replaces that view's inferred tree while the view keeps its chart context (mark, axes, legends).
- The **empty string `""`** — the description of the dataset as a whole, used when the spec has no visualization.

A key's mere presence means it is authored (and overrides inference); omit a key to leave that view on Umwelt's faithful default. `text` is serialized only when at least one structure is authored.

## Nodes

Each structure is an array of nodes forming a tree. A node is either a **group** or a **predicate**.

### Group node

Divides the data by one or more fields — multiple fields cross into a combined grouping.

| Property | Type | Description |
| --- | --- | --- |
| `nodeType` | `"group"` | Discriminator. |
| `groupby` | array | One or more field references (see below). |
| `children` | array | Nested nodes dividing each branch further. |

```json
{
  "nodeType": "group",
  "groupby": [{ "field": "symbol" }],
  "children": [
    { "nodeType": "group", "groupby": [{ "field": "date" }], "children": [] }
  ]
}
```

A group **field reference** is `{ "field": "..." }` and may carry per-grouping discretization:

| Property | Type | Description |
| --- | --- | --- |
| `field` | string | The field to group by. |
| `type` | string | Override the measure type for this grouping only. `ordinal` yields one branch per value; `quantitative` / `temporal` yield range bins. |
| `bin` | boolean | Bin a quantitative field into intervals. |
| `timeUnit` | string | Bucket a temporal field (`year`, `month`, …). |

Grouping the same field under two different signatures across branches is supported: Umwelt materializes a distinct derived column for the divergent signature so Olli, which resolves fields by name, honors each independently.

### Predicate node

A named subset defined by a condition, for slices no field grouping expresses.

| Property | Type | Description |
| --- | --- | --- |
| `nodeType` | `"predicate"` | Discriminator. |
| `predicate` | object | A predicate, authored as an `and` of field conditions. |
| `name` | string | Label for the branch (optional). |
| `reasoning` | string | Optional note on why this subset matters. |
| `children` | array | Nested nodes. |

```json
{
  "nodeType": "predicate",
  "name": "After 1975",
  "predicate": { "and": [{ "field": "year", "gte": 1975 }] },
  "children": []
}
```

Field conditions use the usual predicate operators (`equal`, `oneOf`, `lt`, `lte`, `gt`, `gte`, `range`, `valid`). Temporal values are written as strings and coerced to dates at render time.

## Elaboration

On import, Umwelt regenerates every node's internal id so a serialized id can't collide with one the editor later mints; the tree shape and content are preserved. This is an editor-facing detail — nodes carry an `id` in the live spec, but it is not part of the authored contract.

## Next

- [Fields & the Key](/docs/spec-fields) — the field definitions groupings refer to.
- [Quickstart](/docs/quickstart) — render a spec with `umwelt-js`.
