# Exploring the Viewer

The Viewer is the right half of the editor: the live result of your spec, in three coordinated sections. It updates immediately as you edit. (The same viewer can be [embedded in any web page](/docs/quickstart) — everything here applies to embedded viewers too.)

## Visualization

The rendered chart. It's interactive: drag across it to brush a selection, and the selection is reflected in the description view, so what you select visually is also available textually. The visualization carries a text description for screen readers; its full content is navigable in the Description section.

## Description

A structured, keyboard-navigable textual representation of the data, powered by [Olli](https://umwelt-data.github.io/olli/). Focus the tree and:

- **Down Arrow** enters the structure — from the chart summary into axes and legends, then into categories and individual data points.
- **Left/Right Arrows** step across items at the same level.
- **Up Arrow** goes back up.
- `t` opens the data at the current position as a table; `f` opens a filter dialog; `?` lists all shortcuts.

Navigation is bidirectional with the chart: as you move through the tree, the corresponding data points are highlighted in the visualization, and brushing the chart updates the tree's selection.

For the complete navigation reference, including screen reader setup, see the [Olli user guide](https://umwelt-data.github.io/olli/using/).

## Sonification

Each audio unit appears with a plain-language summary of what it plays (for the stocks default: pitch representing price, playing each symbol's dates in order), followed by its controls:

- **Traversal controls** — one control per traversal field. Nominal fields get a dropdown (pick which company is playing); ordered fields get a slider (scrub through dates). During playback these advance automatically; while paused, they let you jump to any position and listen from there.
- **Play / Pause** — starts and stops playback. From anywhere on the page (outside a text input), the `p` key does the same.

Below the units are engine-wide settings:

- **Playback rate** — from 0.1× to 4× speed.
- **Speak axis ticks** — when checked, a speech voice announces traversal values (like axis labels) as playback crosses them, at an adjustable speech rate.
- **Mute** — silence the tones (useful with Speak axis ticks to hear only the labels).

## Next

- [Sharing & Export](/using/sharing) — send what you've made to someone else.
