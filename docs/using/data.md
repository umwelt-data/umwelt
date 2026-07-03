# Loading Data

The **Data** tab is where you choose the dataset to represent. Umwelt accepts tabular data — rows of records with named columns — as JSON or CSV.

## The data table

The top of the tab shows the current dataset as a table, one row per record. Values are formatted according to each field's current type and transforms, so this table is also a quick way to confirm that dates and numbers were parsed the way you expect.

## Upload a file

Under **Upload JSON or CSV file**, choose a file from your computer. JSON files should contain an array of objects; CSV files should have a header row. The data is parsed, type-coerced, and loaded into the editor.

Uploaded data stays in your browser — nothing is sent to a server. If you later [share your work as a URL](/using/sharing), the dataset is embedded in the link itself so others can open it.

## Load from a URL

Under **Load data from URL**, paste a link to a JSON or CSV file hosted on the web. Umwelt fetches and parses it the same way. Specs that reference a URL stay small when shared, since the link points at the data rather than embedding it.

## Recently uploaded files

Datasets you've loaded before are listed under **Recently uploaded files**, so you can switch between them without re-uploading. They're stored locally in your browser; use the **Remove** button next to a file to forget it.

## Example datasets

The **Example datasets** list offers a selection from the [vega-datasets](https://github.com/vega/vega-datasets) collection — including `stocks.csv`, `cars.json`, `weather.csv`, `penguins.json`, and `gapminder.json` — useful for trying out the editor before bringing your own data. When you first open the editor with no data loaded, the first example dataset is loaded automatically.

## What happens after loading

Loading a dataset kicks off Umwelt's inference: it creates a field for each column, infers field types, detects a [key](/using/fields#the-key), and proposes a default visualization and sonification. Your working state is saved in the browser, so reloading the page picks up where you left off.

## Next

- [Configuring Fields](/using/fields) — review the inferred types and key, and assign encodings.
