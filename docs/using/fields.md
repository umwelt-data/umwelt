# Configuring Fields

The **Fields** tab is the center of the editor. It's where you choose which fields to work with, confirm how Umwelt interprets them, and assign them to visual and audio encodings — all from one place, without switching between modalities.

## Selecting fields

Under **Select fields**, each column of the dataset appears with a checkbox. Only checked (active) fields participate in the representation: they appear in field definitions, count toward key detection, and can be assigned to encodings. Uncheck fields you don't need to keep the interface focused.

## The key

The **Key** is the set of fields whose values uniquely identify each data point — like a primary key in a database. For the stocks dataset, no single field is unique, but `symbol` and `date` together identify exactly one price.

The key matters because it's what keeps the modalities aligned: the same data point can be found under the same identity in the chart, the description tree, and the sonification's playback order. Umwelt detects the key automatically whenever the active fields change. When the key has multiple fields, you can drag to reorder them, which affects how the data is grouped and traversed.

Key fields have one restriction: they can't be aggregated (they identify data points rather than measure them). A quantitative field can only serve in a key once it's binned or, for dates, assigned a time unit.

## Field definitions

Each active field gets a definition card with:

### Type

One of four measure types, in the sense used by visualization grammars:

- **nominal** — unordered categories (`symbol`)
- **ordinal** — ordered categories
- **quantitative** — numeric measures (`price`)
- **temporal** — dates and times (`date`)

Umwelt infers a type from the data, and the dropdown only offers types the values actually support — you can't mark a field temporal unless its values parse as dates.

### Encodings

Encodings map the field to properties of the output: visual properties like `x`, `y`, or `color`, and audio properties like `pitch`. Press **Add encoding** and Umwelt picks a sensible property for the field's type — quantitative fields prefer `y` or `pitch`, nominal fields prefer `color`. You can then change the property with the dropdown, and, if you have multiple visual or audio units, choose which unit the encoding belongs to. **Remove encoding** takes it away.

The same field can be encoded multiple times — for example, `price` on the y-axis *and* on pitch. This is the normal way to build multimodal representations: assign the same fields across visual and audio properties.

### Additional options

Depending on the type, a field can carry transforms:

- **Aggregate** (quantitative, non-key fields) — summarize with `mean`, `median`, `min`, `max`, `sum`, or `count`.
- **Bin** (quantitative or temporal) — group continuous values into intervals.
- **Time unit** (temporal) — bucket dates by `year`, `month`, `yearmonth`, `day`, and so on.

Transforms set here apply everywhere the field is used. Individual encodings can override them from the [Visual](/using/visual) and [Audio](/using/audio) tabs.

## Next

- [Designing Visualizations](/using/visual) — marks, visual encodings, and multiple views.
- [Designing Sonifications](/using/audio) — audio encodings and traversal order.
