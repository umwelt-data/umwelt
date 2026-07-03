# Designing Visualizations

The **Visual** tab controls how the data is drawn. A visualization is made of one or more **units** — each unit is a single chart with a mark type and a set of visual encodings.

## Mark

Each unit draws the data with one mark type: **point**, **line**, **bar**, or **area**. For the stocks example, the default is `line`; switching it to `point` turns the multi-series line chart into a scatterplot of the same encodings.

## Encodings

A unit's encodings list which fields map to which visual properties. Umwelt supports:

| Property | Meaning |
| --- | --- |
| `x`, `y` | Position |
| `color` | Hue (typically for categories) |
| `shape` | Point shape |
| `size` | Mark size |
| `opacity` | Mark opacity |
| `order` | Drawing order |
| `facet` | Split into small multiples by category |

Encodings are usually assigned from the [Fields tab](/using/fields#encodings), but each encoding also appears here with its own controls: change which field it uses, remove it, or override the field's transforms for this encoding only. The transform dropdowns offer **Inherit** (use whatever the field definition says), **None** (explicitly no transform, even if the field has one), or a specific value.

## Multiple units and composition

Press **Add visual unit** to create additional charts. With more than one unit, each gets a name (which you can edit — names are how encodings refer to units) and a **Composition** control appears:

- **layer** — draw the units on top of each other in one view.
- **concat** — place the units side by side as separate views.

A common pattern is concatenating two units that show different fields of the same data — the shared key keeps selections coordinated across them.

## Next

- [Designing Sonifications](/using/audio) — the audio counterpart to this tab.
- [Exploring the Viewer](/using/viewer) — how the rendered chart interacts with the other views.
