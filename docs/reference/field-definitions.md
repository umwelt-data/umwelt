# Field Definitions

Field definitions configure how data columns are interpreted and transformed in UmweltSpecs. Each field definition specifies the data type, transformations, and encoding usage for a single data column.

## FieldDef Interface

```typescript
interface FieldDef {
  active: boolean;                    // Include field in analysis
  name: FieldName;                    // Column name in data
  type?: MeasureType;                 // Data type override
  encodings: EncodingRef[];           // Which encodings use this field
  scale?: ScaleDomain;                // Scale configuration
  timeUnit?: UmweltTimeUnit;          // Temporal component extraction
  aggregate?: UmweltAggregateOp;      // Aggregation function
  bin?: boolean;                      // Group continuous values
  sort?: Sort<any>;                   // Sorting specification
}

type FieldName = string;
type MeasureType = "quantitative" | "ordinal" | "nominal" | "temporal";
```

## Data Types

### Quantitative
Numeric data with meaningful arithmetic operations.

```typescript
// Basic quantitative field
{
  active: true,
  name: "temperature",
  type: "quantitative",
  encodings: [
    { property: "y", unit: "chart1" },
    { property: "pitch", unit: "audio1" }
  ]
}

// With aggregation
{
  active: true,
  name: "sales",
  type: "quantitative",
  aggregate: "mean",
  encodings: [{ property: "y", unit: "summary_chart" }]
}

// With binning
{
  active: true,
  name: "age",
  type: "quantitative",
  bin: true,
  encodings: [{ property: "x", unit: "histogram" }]
}
```

### Ordinal
Categorical data with meaningful order.

```typescript
// Basic ordinal field
{
  active: true,
  name: "rating",
  type: "ordinal",
  encodings: [
    { property: "color", unit: "scatter" }
  ]
}

// With custom sort order
{
  active: true,
  name: "education_level",
  type: "ordinal",
  sort: { field: "education_level", order: "ascending" },
  encodings: [{ property: "x", unit: "comparison" }]
}
```

### Nominal
Categorical data without meaningful order.

```typescript
// Basic nominal field
{
  active: true,
  name: "category",
  type: "nominal",
  encodings: [
    { property: "color", unit: "main_chart" },
    { property: "shape", unit: "scatter" }
  ]
}

// Used for grouping in aggregation
{
  active: true,
  name: "region",
  type: "nominal",
  encodings: []  // Not directly encoded, used for grouping
}
```

### Temporal
Date/time data with temporal operations.

```typescript
// Basic temporal field
{
  active: true,
  name: "date",
  type: "temporal",
  encodings: [{ property: "x", unit: "time_series" }]
}

// With time unit extraction
{
  active: true,
  name: "timestamp",
  type: "temporal",
  timeUnit: "month",
  encodings: [{ property: "x", unit: "seasonal_chart" }]
}

// Multiple time units for different views
{
  active: true,
  name: "created_at",
  type: "temporal",
  timeUnit: "yearmonth",
  encodings: [
    { property: "x", unit: "trend_view" },
    { property: "facet", unit: "detailed_view" }
  ]
}
```

## Transformations

### Aggregation Operations

```typescript
// Available aggregation options
type UmweltAggregateOp = "mean" | "median" | "min" | "max" | "sum" | "count";

// Mean aggregation
{
  name: "price",
  type: "quantitative",
  aggregate: "mean",
  // ...
}

// Count aggregation (useful for any field type)
{
  name: "customer_id",
  type: "nominal", 
  aggregate: "count",
  // ...
}
```

### Time Unit Extraction

```typescript
// Available time units
type UmweltTimeUnit = "year" | "quarter" | "month" | "yearmonth" | 
                     "day" | "date" | "hours" | "minutes" | "seconds";

// Extract month component
{
  name: "order_date",
  type: "temporal",
  timeUnit: "month",
  // ...
}

// Extract year-month combination
{
  name: "event_timestamp", 
  type: "temporal",
  timeUnit: "yearmonth",
  // ...
}
```

### Binning

```typescript
// Enable binning for continuous data
{
  name: "income",
  type: "quantitative", 
  bin: true,
  encodings: [{ property: "x", unit: "distribution" }]
}

// Binning with aggregation
{
  name: "score",
  type: "quantitative",
  bin: true,
  aggregate: "count",  // Count observations in each bin
  encodings: [{ property: "y", unit: "histogram" }]
}
```

## Scale Configuration

```typescript
interface ScaleDomain {
  domain?: UmweltValue[];     // Custom domain values
  zero?: boolean;             // Include zero in domain
  nice?: boolean | number;    // Nice numbers for domain
}

// Custom domain
{
  name: "percentage",
  type: "quantitative",
  scale: {
    domain: [0, 100],
    zero: true
  },
  // ...
}

// Nice domain boundaries
{
  name: "temperature",
  type: "quantitative", 
  scale: {
    nice: true
  },
  // ...
}
```

## Encoding References

```typescript
interface EncodingRef {
  property: EncodingPropName;   // Visual or audio property
  unit: string;                 // Unit name that uses this encoding
}

type EncodingPropName = 
  // Visual properties
  "x" | "y" | "color" | "size" | "shape" | "opacity" | "order" | "facet" |
  // Audio properties  
  "pitch" | "duration" | "volume";
```

### Multiple Encodings Example

```typescript
// Field used in multiple contexts
{
  active: true,
  name: "revenue",
  type: "quantitative", 
  encodings: [
    { property: "y", unit: "main_chart" },        // Visual position
    { property: "size", unit: "bubble_chart" },   // Visual size
    { property: "pitch", unit: "sonification" },  // Audio pitch
    { property: "color", unit: "heatmap" }        // Visual color
  ]
}
```

## Complete Examples

### Time Series Data

```typescript
const timeSeriesFields: FieldDef[] = [
  {
    active: true,
    name: "date",
    type: "temporal",
    encodings: [{ property: "x", unit: "trend_chart" }]
  },
  {
    active: true,
    name: "value", 
    type: "quantitative",
    encodings: [
      { property: "y", unit: "trend_chart" },
      { property: "pitch", unit: "audio_trend" }
    ]
  },
  {
    active: true,
    name: "category",
    type: "nominal",
    encodings: [{ property: "color", unit: "trend_chart" }]
  }
];
```

### Survey Data

```typescript
const surveyFields: FieldDef[] = [
  {
    active: true,
    name: "respondent_id",
    type: "nominal",
    aggregate: "count",
    encodings: [{ property: "y", unit: "response_counts" }]
  },
  {
    active: true,
    name: "satisfaction_rating",
    type: "ordinal",
    encodings: [
      { property: "x", unit: "rating_distribution" },
      { property: "pitch", unit: "rating_audio" }
    ]
  },
  {
    active: true,
    name: "department",
    type: "nominal", 
    encodings: [{ property: "color", unit: "rating_distribution" }]
  }
];
```

### Scientific Measurements

```typescript
const measurementFields: FieldDef[] = [
  {
    active: true,
    name: "specimen_id", 
    type: "nominal",
    encodings: []  // Used for grouping only
  },
  {
    active: true,
    name: "mass",
    type: "quantitative",
    scale: { zero: true, nice: true },
    encodings: [
      { property: "x", unit: "correlation_plot" },
      { property: "volume", unit: "mass_audio" }
    ]
  },
  {
    active: true,
    name: "length",
    type: "quantitative", 
    bin: true,
    encodings: [{ property: "y", unit: "size_distribution" }]
  },
  {
    active: true,
    name: "collection_date",
    type: "temporal",
    timeUnit: "month",
    encodings: [{ property: "facet", unit: "seasonal_view" }]
  }
];
```

## Validation Requirements

Fields must satisfy these constraints:

```typescript
// Required fields
- active: boolean (required)
- name: string (required, must exist in data)
- encodings: EncodingRef[] (required, can be empty)

// Type-specific constraints
- timeUnit: only valid when type === "temporal"
- bin: only valid when type === "quantitative"  
- aggregate: valid for all types

// Encoding constraints
- property in encodings must be valid EncodingPropName
- unit in encodings must reference existing visual or audio unit
```