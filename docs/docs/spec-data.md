# Data

The spec's `data` property names a tabular dataset — an array of records with named columns. It takes one of three forms, resolved in this priority order: embedded values, then a URL, then a built-in dataset name.

## Embedded values

```json
{
  "data": {
    "name": "sales",
    "values": [
      { "region": "North", "sales": 120 },
      { "region": "South", "sales": 90 }
    ]
  }
}
```

The dataset travels inside the spec. This is what the editor produces when the data was uploaded from a file, and it's the right form for small or generated datasets. It makes [share URLs](/docs/editor-urls#keeping-links-short) self-contained but long.

## URL

```json
{
  "data": {
    "name": "stocks.csv",
    "url": "https://raw.githubusercontent.com/vega/vega-datasets/master/data/stocks.csv"
  }
}
```

The data is fetched when the spec loads. JSON files should contain an array of objects; CSV files should have a header row. Values are type-coerced after parsing (numeric strings become numbers, date-like strings become dates). If `name` is omitted, the URL's filename is used.

## Built-in dataset name

```json
{
  "data": { "name": "stocks.csv" }
}
```

A name-only source refers to Umwelt's built-in example datasets, drawn from [vega-datasets](https://github.com/vega/vega-datasets): `stocks.csv`, `cars.json`, `weather.csv`, `seattle-weather.csv`, `penguins.json`, `driving.json`, `barley.json`, `disasters.csv`, and `gapminder.json`. A name that isn't in this registry is an error — a name-only source can't refer to arbitrary data.

## Next

- [Fields & the Key](/docs/spec-fields) — describing the columns of the dataset.
