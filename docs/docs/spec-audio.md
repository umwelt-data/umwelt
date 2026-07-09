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
| `instrument` | string | Optional timbre preset for the unit (see [Instrument](#instrument)). |
| `encoding` | object | A map from audio property to encoding field definition. |
| `traversal` | array | Ordered field references defining playback order. |

```json
{
  "name": "audio_unit_0",
  "instrument": "pure",
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
| `pan` | Higher values play further right in the stereo field |

As with visual encodings, each value is a field reference that inherits the field's definition, and may locally override `type`, `aggregate`, `timeUnit`, `scale`, or `sort` (audio encodings can't `bin`). The `"None"` sentinel removes an inherited transform.

### Pan

`pan` places a tone in the stereo field, from fully left (`-1`) to fully right (`+1`); the default range is `[-0.9, 0.9]`, kept just short of the extremes so a tone never drops out of one ear entirely.

Pan is most effective as a **redundant** channel — encode the innermost traversal field on both the playback order and pan, and the left-to-right sweep becomes spatial, mirroring a chart's x-axis. It also gives layered units a second way (besides timbre) to stay separable.

Because stereo position is inaudible to listeners with single-sided hearing loss and collapses on mono or laptop speakers, avoid using `pan` as the *only* carrier of a field. Reserve it for reinforcement, and always encode the underlying field somewhere else too.

## Instrument

`instrument` sets the unit's timbre — the audio analog of a visual `mark`. It is a property of the whole unit, not a per-datum encoding: timbre is what makes two simultaneous layers cohere as separate voices, so it does layer-identity work rather than carrying a field's values.

| Instrument | Character |
| --- | --- |
| `pure` | Clean triangle beep — the default; most legible for judging pitch |
| `bright` | Buzzy sawtooth |
| `hollow` | Clarinet-like square with a slow attack |
| `bell` | Inharmonic FM bell |
| `reed` | Reedy, slightly rough AM tone |
| `strings` | Detuned-unison pad |

The presets are chosen to be roughly equally distinguishable from one another. When `instrument` is omitted, a lone unit uses `pure`, and layered units are each assigned a distinct timbre automatically. Set it explicitly to control which voice a layer takes, or to give a single unit a different character.

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
- **`layer`** — units play *simultaneously* under a single shared traversal and one set of controls, like overlaid series on a shared axis. Layered units share the same traversal field(s); their domains are unioned so one cursor sweeps them together, and a layer falls silent at any step it has no datum for. Each layer sounds on its own timbre (its `instrument`, or an auto-assigned distinct one) so they stay distinguishable, while its encoding scales (`pitch`, `duration`, `volume`, `pan`) remain independent.

  Layers stay locked to one shared clock: each traversal step is a slot in which every layer sounds together, and the slot lasts as long as the *longest* layer's `duration` at that step. So a layer's `duration` encoding sets how long its tone sustains within the slot — never how far the cursor advances — and the layers never drift apart.

## Next

- [Text Structure](/docs/spec-text) — authoring the description tree.
- [Quickstart](/docs/quickstart) — render a spec with `umwelt-js`.
- [Gallery](/gallery/) — complete specs to hear and remix.
