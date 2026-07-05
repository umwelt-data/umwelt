# Designing Sonifications

The **Audio** tab controls how the data sounds. Like the visual side, a sonification is made of one or more **units** — but where a visual unit maps fields to positions on the screen, an audio unit maps fields to properties of a tone and plays the data over time.

## Encodings

An audio unit's encodings map fields to properties of the sound:

| Property | Meaning |
| --- | --- |
| `pitch` | Higher values play higher tones |
| `duration` | Higher values play longer tones |
| `volume` | Higher values play louder tones |

For the stocks example, the default sonification encodes `price` as `pitch` — a rising melody is a rising price. As in the Visual tab, each encoding can change its field, be removed, or override the field's transforms (**Inherit** / **None** / a specific value).

## Traversals

Sound happens in time, so a sonification needs an order in which to play the data. That's the **traversal**: an ordered list of fields that works like nested loops. The stocks default traverses `symbol`, then `date` — for each company, play its prices in date order, then move to the next company.

Reorder the traversal by dragging fields in the list. Flipping the stocks traversal to `date`, then `symbol` would instead play all five companies' prices at each date before advancing — useful for comparing companies at a moment, rather than following each company over time.

Traversal fields can be binned (quantitative) or bucketed by time unit (temporal), which coarsens the traversal into groups. Traversal fields can't be aggregated — they define the steps of playback, while the encoded fields are what get aggregated within each step.

In the Viewer, each traversal field becomes an interactive control that both shows where playback is and lets you scrub to a position — see [Exploring the Viewer](/using/viewer#sonification).

## Multiple units and composition

Press **Add audio unit** to create additional sonifications — for example, one unit per measure of interest. With more than one unit, each gets an editable name and a **Composition** control:

- **`concat`** plays the units as separate sequences — each gets its own playback controls in the viewer, and you play them one at a time.
- **`layer`** plays the units at the same time under one shared traversal, like overlaying series on a shared axis. The layered units share a single set of playback and traversal controls, and each is given a distinct timbre so you can tell them apart. Layers should share the same traversal field(s); a layer goes quiet wherever it has no data for the current step.

## Next

- [Designing Text Descriptions](/using/text) — shaping the navigable description tree.
- [Exploring the Viewer](/using/viewer) — playback controls, speed, and speech settings.
