# Getting Started

Umwelt is an editor for creating accessible, multimodal representations of data. From a single specification, it produces three coordinated views: a **visualization**, a **structured textual description** you can navigate with a keyboard or screen reader, and a **sonification** that plays your data as sound. You can author and explore these representations in any order — none of them is primary.

The editor runs entirely in your browser at [umwelt-data.github.io/umwelt/editor](https://umwelt-data.github.io/umwelt/editor/). There is nothing to install, and your data never leaves your machine.

## The layout

The page has two halves. The **Editor** contains five tabs — Data, Fields, Visual, Audio, and Export — where you define what to represent and how. The **Viewer** shows the live result: the visualization, the description, and the sonification, updating as you edit.

## Load a dataset

When you first open the editor, it loads an example dataset (`stocks.csv` — daily stock prices for five tech companies) so you can start exploring immediately. The **Data** tab shows the dataset as a table, and offers three ways to load your own data: upload a JSON or CSV file, load from a URL, or pick another example dataset. See [Loading Data](/using/data).

## Check the fields

Switch to the **Fields** tab. Umwelt has already inspected the data: each column becomes a field with an inferred type (`symbol` is nominal, `date` is temporal, `price` is quantitative), and Umwelt has detected a **key** — the set of fields that uniquely identifies each data point (here, `symbol` and `date` together). The key is what lets Umwelt keep the visual, audio, and textual views aligned. See [Configuring Fields](/using/fields).

## See the defaults

Based on the fields and key, Umwelt proposes a default representation. For the stocks data, that's a multi-series line chart (date on x, price on y, one colored line per symbol) and a sonification that maps price to pitch, playing each company's prices in sequence.

Look at the Viewer:

- **Visualization** — the rendered chart. Drag over it to select a region; the description view updates to match.
- **Description** — a keyboard-navigable tree of the data, powered by [Olli](https://umwelt-data.github.io/olli/using/). Focus it and press the arrow keys to move through summaries, axes, and data points.
- **Sonification** — press **Play** (or the `p` key) to hear the data. Price maps to pitch: rising tones are rising prices.

## Make it yours

From here, everything is editable:

- The **Visual** tab controls marks and visual encodings — see [Designing Visualizations](/using/visual).
- The **Audio** tab controls audio encodings and playback order — see [Designing Sonifications](/using/audio).
- The **Export** tab gives you a shareable link and the underlying spec — see [Sharing & Export](/using/sharing).

## Screen reader notes

The editor is built to be operated with a screen reader. Two things to know:

- The description view uses single-key shortcuts (arrow keys, letter keys). Your screen reader needs to pass those keys through — turn off Quick Nav in VoiceOver, use Focus mode in NVDA, or Forms mode in JAWS. The [Olli getting started guide](https://umwelt-data.github.io/olli/using/) covers setup in detail.
- Sonification playback can be toggled from anywhere on the page with the `p` key (outside a text input).

## Next

- [Loading Data](/using/data) — file upload, URLs, and example datasets.
- [Configuring Fields](/using/fields) — field types, the key, and encodings.
- [Gallery](/gallery/) — examples to open and remix in the editor.
