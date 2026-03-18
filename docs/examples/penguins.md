<script setup>
import UmweltWrapper from '../UmweltWrapper.vue'

const penguinsSpec = {
  "data": {
    "name": "penguins.json",
    "url": "https://raw.githubusercontent.com/vega/vega-datasets/refs/heads/main/data/penguins.json"
  },
  "key": [],
  "visual": {
    "units": [
      {
        "name": "vis_unit_0",
        "mark": "point",
        "encoding": {
          "x": {
            "field": "Flipper Length (mm)"
          },
          "y": {
            "field": "Body Mass (g)"
          },
          "color": {
            "field": "Species"
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
            "field": "Flipper Length (mm)",
            "aggregate": "mean"
          }
        },
        "traversal": [
          {
            "field": "Body Mass (g)",
            "bin": true
          }
        ]
      },
      {
        "name": "audio_unit_1",
        "encoding": {
          "pitch": {
            "field": "Body Mass (g)",
            "aggregate": "mean"
          }
        },
        "traversal": [
          {
            "field": "Flipper Length (mm)",
            "bin": true
          }
        ]
      }
    ],
    "composition": "concat"
  },
  "fields": [
    {
      "active": true,
      "name": "Species",
      "type": "nominal"
    },
    {
      "active": false,
      "name": "Island",
      "type": "nominal"
    },
    {
      "active": false,
      "name": "Beak Length (mm)",
      "type": "quantitative"
    },
    {
      "active": false,
      "name": "Beak Depth (mm)",
      "type": "quantitative"
    },
    {
      "active": true,
      "name": "Flipper Length (mm)",
      "type": "quantitative"
    },
    {
      "active": true,
      "name": "Body Mass (g)",
      "type": "quantitative"
    },
    {
      "active": false,
      "name": "Sex",
      "type": "nominal"
    }
  ]
}
</script>

# Penguin Measurements by Species

<UmweltWrapper :spec="penguinsSpec" />

## Specification

```json
{
  "data": {
    "name": "penguins.json",
    "url": "https://raw.githubusercontent.com/vega/vega-datasets/refs/heads/main/data/penguins.json"
  },
  "key": [],
  "visual": {
    "units": [
      {
        "name": "vis_unit_0",
        "mark": "point",
        "encoding": {
          "x": {
            "field": "Flipper Length (mm)"
          },
          "y": {
            "field": "Body Mass (g)"
          },
          "color": {
            "field": "Species"
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
            "field": "Flipper Length (mm)",
            "aggregate": "mean"
          }
        },
        "traversal": [
          {
            "field": "Body Mass (g)",
            "bin": true
          }
        ]
      },
      {
        "name": "audio_unit_1",
        "encoding": {
          "pitch": {
            "field": "Body Mass (g)",
            "aggregate": "mean"
          }
        },
        "traversal": [
          {
            "field": "Flipper Length (mm)",
            "bin": true
          }
        ]
      }
    ],
    "composition": "concat"
  },
  "fields": [
    {
      "active": true,
      "name": "Species",
      "type": "nominal"
    },
    {
      "active": false,
      "name": "Island",
      "type": "nominal"
    },
    {
      "active": false,
      "name": "Beak Length (mm)",
      "type": "quantitative"
    },
    {
      "active": false,
      "name": "Beak Depth (mm)",
      "type": "quantitative"
    },
    {
      "active": true,
      "name": "Flipper Length (mm)",
      "type": "quantitative"
    },
    {
      "active": true,
      "name": "Body Mass (g)",
      "type": "quantitative"
    },
    {
      "active": false,
      "name": "Sex",
      "type": "nominal"
    }
  ]
}
```