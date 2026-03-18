<script setup>
import UmweltWrapper from '../UmweltWrapper.vue'

const stocksSpec = {
  "data": {
    "name": "stocks.csv",
    "url": "https://raw.githubusercontent.com/vega/vega-datasets/refs/heads/main/data/stocks.csv"
  },
  "key": [
    "symbol",
    "date"
  ],
  "visual": {
    "units": [
      {
        "name": "vis_unit_0",
        "mark": "line",
        "encoding": {
          "x": {
            "field": "date"
          },
          "y": {
            "field": "price"
          },
          "color": {
            "field": "symbol"
          }
        }
      }
    ],
    "composition": "layer"
  },
  "audio": {
    "units": [
      {
        "name": "audio_unit_0",
        "encoding": {
          "pitch": {
            "field": "price"
          }
        },
        "traversal": [
          {
            "field": "symbol"
          },
          {
            "field": "date"
          }
        ]
      }
    ],
    "composition": "concat"
  },
  "fields": [
    {
      "active": true,
      "name": "symbol",
      "type": "nominal"
    },
    {
      "active": true,
      "name": "date",
      "type": "temporal"
    },
    {
      "active": true,
      "name": "price",
      "type": "quantitative"
    }
  ]
}
</script>

# Tech Company Stocks

<UmweltWrapper :spec="stocksSpec" />

## Specification

```json
{
  "data": {
    "name": "stocks.csv",
    "url": "https://raw.githubusercontent.com/vega/vega-datasets/refs/heads/main/data/stocks.csv"
  },
  "key": [
    "symbol",
    "date"
  ],
  "visual": {
    "units": [
      {
        "name": "vis_unit_0",
        "mark": "line",
        "encoding": {
          "x": {
            "field": "date"
          },
          "y": {
            "field": "price"
          },
          "color": {
            "field": "symbol"
          }
        }
      }
    ],
    "composition": "layer"
  },
  "audio": {
    "units": [
      {
        "name": "audio_unit_0",
        "encoding": {
          "pitch": {
            "field": "price"
          }
        },
        "traversal": [
          {
            "field": "symbol"
          },
          {
            "field": "date"
          }
        ]
      }
    ],
    "composition": "concat"
  },
  "fields": [
    {
      "active": true,
      "name": "symbol",
      "type": "nominal"
    },
    {
      "active": true,
      "name": "date",
      "type": "temporal"
    },
    {
      "active": true,
      "name": "price",
      "type": "quantitative"
    }
  ]
}
```