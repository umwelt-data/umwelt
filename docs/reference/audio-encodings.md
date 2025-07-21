# Audio Encodings

Audio encodings map data fields to sound properties for sonification. Audio units combine encoding mappings with traversal specifications to create sequential data playback experiences.

## AudioSpec Structure

```typescript
interface AudioSpec {
  units: AudioUnitSpec[];               // Individual sonification specifications
  composition: ViewComposition;         // "layer" | "concat"
}

interface AudioUnitSpec {
  name: string;                         // Unique identifier
  encoding: AudioEncoding;              // Field-to-audio mappings
  traversal: AudioTraversal;            // Data playback order
}

type ViewComposition = "layer" | "concat";
```

## Audio Properties

```typescript
interface AudioEncoding {
  pitch?: AudioEncodingFieldDef;        // Sound frequency (Hz)
  duration?: AudioEncodingFieldDef;     // Note length (seconds)
  volume?: AudioEncodingFieldDef;       // Sound amplitude (0-1)
}

interface AudioEncodingFieldDef {
  field: FieldName;                     // Data field reference
  scale?: ScaleDomain & ScaleRange;     // Scale configuration
  timeUnit?: UmweltTimeUnit | "None";   // Time unit override
  aggregate?: UmweltAggregateOp | "None"; // Aggregation override
  sort?: Sort<any>;                     // Sort specification
  bin?: undefined;                      // Not supported for audio
}
```

## Audio Property Details

### Pitch
Maps data values to sound frequency (perceived as high/low).

```typescript
// Basic pitch mapping
pitch: { field: "temperature" }

// With custom frequency range (Hz)
pitch: { 
  field: "score",
  scale: { range: [200, 800] }  // 200Hz to 800Hz
}

// With aggregation
pitch: { 
  field: "sales", 
  aggregate: "mean" 
}

// Temporal aggregation
pitch: {
  field: "daily_temperature",
  timeUnit: "month",
  aggregate: "mean"
}
```

### Duration
Maps data values to note length (perceived as short/long).

```typescript
// Basic duration mapping
duration: { field: "magnitude" }

// With custom duration range (seconds)
duration: {
  field: "confidence",
  scale: { range: [0.1, 2.0] }  // 100ms to 2 seconds
}

// Constant duration (useful as baseline)
duration: { 
  field: "constant_field",  // Field with same value
  scale: { range: [0.5, 0.5] }  // Always 500ms
}
```

### Volume
Maps data values to sound amplitude (perceived as quiet/loud).

```typescript
// Basic volume mapping
volume: { field: "importance" }

// With custom amplitude range (0-1)
volume: {
  field: "signal_strength", 
  scale: { range: [0.2, 0.8] }  // 20% to 80% max volume
}

// Binary volume for categorical data
volume: {
  field: "is_significant",
  scale: { range: [0.3, 0.7] }  // Low/high volume
}
```

## Data Traversal

### AudioTraversal Structure
```typescript
type AudioTraversal = AudioTraversalFieldDef[];

interface AudioTraversalFieldDef {
  field: FieldName;                     // Field to traverse
  scale?: ScaleDomain & ScaleRange;     // Scale configuration
  timeUnit?: UmweltTimeUnit | "None";   // Time unit extraction
  bin?: boolean;                        // Binning for continuous fields
  aggregate?: undefined;                // Not supported for traversal
}
```

### Traversal Order Examples

```typescript
// Simple categorical traversal
traversal: [
  { field: "species" },
  { field: "individual_id" }
]
// Result: All individuals of species A, then species B, etc.

// Temporal traversal
traversal: [
  { field: "company" },
  { field: "date" }
]
// Result: Company A over time, then Company B over time, etc.

// Mixed traversal with time aggregation
traversal: [
  { field: "region" },
  { field: "timestamp", timeUnit: "month" }
]
// Result: Region 1 by month, then Region 2 by month, etc.

// Binned continuous traversal
traversal: [
  { field: "category" },
  { field: "continuous_measure", bin: true }
]
// Result: Category A across bins, then Category B across bins, etc.
```

## Complete Audio Unit Examples

### Simple Time Series Sonification

```typescript
{
  name: "temperature_over_time",
  encoding: {
    pitch: { field: "temperature" }
  },
  traversal: [
    { field: "location" },
    { field: "date" }
  ]
}
// Each location's temperature trend played sequentially
```

### Multi-Dimensional Sonification

```typescript
{
  name: "stock_analysis",
  encoding: {
    pitch: { field: "price" },
    duration: { field: "volume" },
    volume: { field: "volatility" }
  },
  traversal: [
    { field: "stock_symbol" },
    { field: "date", timeUnit: "month" }
  ]
}
// Price as pitch, trading volume as duration, volatility as volume
```

### Categorical Comparison

```typescript
{
  name: "survey_responses",
  encoding: {
    pitch: { 
      field: "satisfaction_rating",
      scale: { range: [300, 600] }  // Clear pitch differences
    },
    duration: {
      field: "response_count",
      aggregate: "count",
      scale: { range: [0.2, 1.0] }
    }
  },
  traversal: [
    { field: "department" },
    { field: "satisfaction_rating" }  // Ordered traversal
  ]
}
// Each department's satisfaction distribution
```

### Scientific Data Sonification

```typescript
{
  name: "experiment_results",
  encoding: {
    pitch: { field: "measurement_value" },
    volume: { 
      field: "confidence_interval",
      scale: { range: [0.3, 0.8] }  // Louder = more confident
    }
  },
  traversal: [
    { field: "experimental_condition" },
    { field: "trial_number" }
  ]
}
// Experimental conditions compared through trial sequences
```

## Multi-Unit Audio Compositions

### Concurrent Composition (Layer)
Multiple sonifications played simultaneously.

```typescript
const layeredAudio: AudioSpec = {
  units: [
    {
      name: "primary_melody",
      encoding: {
        pitch: { field: "main_metric" }
      },
      traversal: [
        { field: "time_period" }
      ]
    },
    {
      name: "harmony",
      encoding: {
        pitch: { 
          field: "secondary_metric",
          scale: { range: [400, 800] }  // Higher register
        }
      },
      traversal: [
        { field: "time_period" }  // Same traversal for sync
      ]
    }
  ],
  composition: "layer"
};
```

### Sequential Composition (Concat)
Multiple sonifications played one after another.

```typescript
const sequentialAudio: AudioSpec = {
  units: [
    {
      name: "overview",
      encoding: {
        pitch: { 
          field: "metric",
          aggregate: "mean"
        }
      },
      traversal: [
        { field: "category" }
      ]
    },
    {
      name: "detail",
      encoding: {
        pitch: { field: "metric" },
        duration: { field: "sample_size" }
      },
      traversal: [
        { field: "category" },
        { field: "subcategory" }
      ]
    }
  ],
  composition: "concat"
};
```

## Scale Configuration

### Audio-Specific Scale Considerations

```typescript
// Pitch scales - use perceptually meaningful ranges
pitch: {
  field: "temperature",
  scale: {
    domain: [-10, 40],        // Celsius range
    range: [200, 800],        // 200Hz to 800Hz (musical range)
    nice: true                // Round to pleasant frequencies
  }
}

// Duration scales - avoid too short or too long
duration: {
  field: "magnitude", 
  scale: {
    domain: [0, 100],
    range: [0.1, 1.5],        // 100ms to 1.5 seconds
    zero: true                // Include zero in domain
  }
}

// Volume scales - preserve dynamic range
volume: {
  field: "confidence",
  scale: {
    domain: [0, 1],
    range: [0.2, 0.7],        // Avoid complete silence or clipping
    nice: false               // Preserve exact mappings
  }
}
```

## Advanced Traversal Patterns

### Hierarchical Traversal

```typescript
// Geographic hierarchy
traversal: [
  { field: "continent" },
  { field: "country" },
  { field: "city" }
]
// Continent by continent, country by country, city by city
```

### Temporal Patterns

```typescript
// Multi-scale temporal analysis
traversal: [
  { field: "year" },
  { field: "date", timeUnit: "month" }
]
// Year-by-year, month-by-month within each year

// Cyclical patterns
traversal: [
  { field: "date", timeUnit: "month" },  // Seasonal cycle
  { field: "location" }                  // Across locations
]
// January across all locations, then February across all locations, etc.
```

### Measurement Hierarchies

```typescript
// Grouped measurements
traversal: [
  { field: "measurement_type" },
  { field: "precision_level" },
  { field: "replicate_number" }
]
// Each measurement type, by precision, by replicate
```

## Property Compatibility

### Data Type Suitability

| Property | Quantitative | Ordinal | Nominal | Temporal |
|----------|--------------|---------|---------|----------|
| pitch    | ✓           | ✓       | ✗*      | ✗        |
| duration | ✓           | ✓       | ✗*      | ✗        |
| volume   | ✓           | ✓       | ✗*      | ✗        |

*Nominal and temporal fields can be used with aggregation (e.g., count)

### Traversal Type Recommendations

| Field Type   | Traversal Use | Notes |
|--------------|---------------|-------|
| Quantitative | With binning  | Group continuous values |
| Ordinal      | Direct        | Natural ordering |  
| Nominal      | Direct        | Categorical grouping |
| Temporal     | With timeUnit | Extract meaningful periods |

## Performance Considerations

### Audio Generation Limits
```typescript
// Practical limits for real-time audio
const maxTraversalLength = 1000;     // ~30 seconds at 0.03s per note
const minNoteDuration = 0.05;        // 50ms minimum for perception
const maxNoteDuration = 3.0;         // 3s maximum to avoid fatigue

// Recommended ranges
const pitchRange = [200, 2000];      // Musical range in Hz
const durationRange = [0.1, 1.0];    // 100ms to 1 second
const volumeRange = [0.1, 0.8];      // Audible but not overwhelming
```