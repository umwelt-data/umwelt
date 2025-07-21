# Visual Encodings

Visual encodings map data fields to visual properties in charts. Each visual unit specifies a mark type and encoding mappings that determine how data appears visually.

## VisualSpec Structure

```typescript
interface VisualSpec {
  units: VisualUnitSpec[];              // Individual chart specifications
  composition: ViewComposition;         // "layer" | "concat"
}

interface VisualUnitSpec {
  name: string;                         // Unique identifier
  mark: Mark;                           // Chart type
  encoding: VisualEncoding;             // Field-to-property mappings
}

type ViewComposition = "layer" | "concat";
type Mark = "point" | "line" | "bar" | "area";
```

## Visual Properties

```typescript
interface VisualEncoding {
  x?: VisualEncodingFieldDef;           // Horizontal position
  y?: VisualEncodingFieldDef;           // Vertical position
  color?: VisualEncodingFieldDef;       // Color encoding
  size?: VisualEncodingFieldDef;        // Size encoding
  shape?: VisualEncodingFieldDef;       // Shape encoding
  opacity?: VisualEncodingFieldDef;     // Transparency
  order?: VisualEncodingFieldDef;       // Layer ordering
  facet?: VisualEncodingFieldDef;       // Small multiples
}

interface VisualEncodingFieldDef {
  field: FieldName;                     // Data field reference
  scale?: ScaleDomain & ScaleRange;     // Scale configuration
  timeUnit?: UmweltTimeUnit | "None";   // Time unit override
  aggregate?: UmweltAggregateOp | "None"; // Aggregation override
  bin?: boolean;                        // Binning override
  sort?: Sort<any>;                     // Sort specification
}
```

## Mark Types

### Point
Individual data points rendered as circles or symbols.

```typescript
// Basic scatter plot
{
  name: "scatter",
  mark: "point",
  encoding: {
    x: { field: "height" },
    y: { field: "weight" },
    color: { field: "species" }
  }
}

// With size encoding
{
  name: "bubble_chart", 
  mark: "point",
  encoding: {
    x: { field: "gdp_per_capita" },
    y: { field: "life_expectancy" },
    size: { field: "population" },
    color: { field: "continent" }
  }
}

// With shape and opacity
{
  name: "multi_encoded",
  mark: "point", 
  encoding: {
    x: { field: "x_measure" },
    y: { field: "y_measure" },
    shape: { field: "category_a" },
    opacity: { field: "confidence" },
    color: { field: "category_b" }
  }
}
```

### Line
Connected data points forming continuous lines.

```typescript
// Simple time series
{
  name: "time_trend",
  mark: "line",
  encoding: {
    x: { field: "date" },
    y: { field: "value" }
  }
}

// Multiple series with color
{
  name: "multi_series",
  mark: "line", 
  encoding: {
    x: { field: "date" },
    y: { field: "price" },
    color: { field: "stock_symbol" }
  }
}

// With temporal aggregation
{
  name: "monthly_trends",
  mark: "line",
  encoding: {
    x: { field: "date", timeUnit: "yearmonth" },
    y: { field: "sales", aggregate: "mean" },
    color: { field: "region" }
  }
}
```

### Bar
Rectangular bars for categorical data and distributions.

```typescript
// Simple bar chart
{
  name: "category_comparison",
  mark: "bar",
  encoding: {
    x: { field: "category" },
    y: { field: "value" }
  }
}

// Grouped bars with color
{
  name: "grouped_bars",
  mark: "bar",
  encoding: {
    x: { field: "month" },
    y: { field: "revenue" },
    color: { field: "product_line" }
  }
}

// Histogram with binning
{
  name: "distribution",
  mark: "bar",
  encoding: {
    x: { field: "measurement", bin: true },
    y: { field: "measurement", aggregate: "count" }
  }
}
```

### Area
Filled areas, often used for cumulative or stacked representations.

```typescript
// Simple area chart
{
  name: "trend_area",
  mark: "area", 
  encoding: {
    x: { field: "date" },
    y: { field: "cumulative_value" }
  }
}

// Stacked areas
{
  name: "stacked_area",
  mark: "area",
  encoding: {
    x: { field: "date" },
    y: { field: "value" },
    color: { field: "category" }
  }
}
```

## Property-Specific Configurations

### Position (x, y)
```typescript
// Basic position mapping
x: { field: "date" }
y: { field: "temperature" }

// With temporal transformation
x: { field: "timestamp", timeUnit: "month" }

// With aggregation
y: { field: "sales", aggregate: "sum" }

// With custom scale
x: { 
  field: "score",
  scale: { domain: [0, 100], nice: true }
}
```

### Color
```typescript
// Categorical color
color: { field: "species" }

// Quantitative color scale
color: { field: "temperature" }

// With custom range
color: { 
  field: "category",
  scale: { range: ["#ff0000", "#00ff00", "#0000ff"] }
}
```

### Size
```typescript
// Proportional to data value
size: { field: "population" }

// With scale bounds
size: {
  field: "magnitude", 
  scale: { range: [10, 100] }
}
```

### Shape
```typescript
// Different shapes for categories
shape: { field: "measurement_type" }

// Limited to small number of categories
shape: { field: "treatment_group" }
```

### Opacity
```typescript
// Transparency based on data
opacity: { field: "confidence_level" }

// Binary transparency
opacity: { field: "is_significant" }
```

### Facet
```typescript
// Small multiples by category
facet: { field: "region" }

// Temporal faceting
facet: { field: "date", timeUnit: "year" }
```

## Multi-Unit Compositions

### Layer Composition
Multiple units in the same coordinate space.

```typescript
const layeredVisual: VisualSpec = {
  units: [
    {
      name: "points",
      mark: "point",
      encoding: {
        x: { field: "x_value" },
        y: { field: "y_value" },
        color: { field: "category" }
      }
    },
    {
      name: "trend_line", 
      mark: "line",
      encoding: {
        x: { field: "x_value" },
        y: { field: "y_value", aggregate: "mean" }
      }
    }
  ],
  composition: "layer"
};
```

### Concat Composition
Multiple units side by side.

```typescript
const concatenatedVisual: VisualSpec = {
  units: [
    {
      name: "overview",
      mark: "line", 
      encoding: {
        x: { field: "date", timeUnit: "year" },
        y: { field: "value", aggregate: "mean" }
      }
    },
    {
      name: "detail",
      mark: "point",
      encoding: {
        x: { field: "date" },
        y: { field: "value" },
        color: { field: "category" }
      }
    }
  ],
  composition: "concat"
};
```

## Encoding Overrides

### Field-Level vs Encoding-Level
Field definitions provide defaults that can be overridden at the encoding level:

```typescript
// Field definition
{
  name: "sales_date",
  type: "temporal", 
  timeUnit: "month",  // Default time unit
  // ...
}

// Encoding override
{
  name: "yearly_view",
  mark: "line",
  encoding: {
    x: { 
      field: "sales_date", 
      timeUnit: "year"  // Override to year
    },
    y: { field: "revenue" }
  }
}

// Disable field-level transform
{
  name: "daily_view", 
  mark: "point",
  encoding: {
    x: {
      field: "sales_date",
      timeUnit: "None"  // Use raw temporal values
    },
    y: { field: "revenue" }
  }
}
```

## Complete Examples

### Dashboard with Multiple Charts

```typescript
const dashboardVisual: VisualSpec = {
  units: [
    {
      name: "trend_overview",
      mark: "line",
      encoding: {
        x: { field: "date", timeUnit: "month" },
        y: { field: "metric", aggregate: "mean" },
        color: { field: "product_category" }
      }
    },
    {
      name: "distribution",
      mark: "bar", 
      encoding: {
        x: { field: "metric", bin: true },
        y: { field: "metric", aggregate: "count" }
      }
    },
    {
      name: "correlation",
      mark: "point",
      encoding: {
        x: { field: "metric_a" },
        y: { field: "metric_b" },
        size: { field: "sample_size" },
        color: { field: "region" }
      }
    }
  ],
  composition: "concat"
};
```

### Scientific Data Visualization

```typescript
const scientificVisual: VisualSpec = {
  units: [
    {
      name: "measurements",
      mark: "point",
      encoding: {
        x: { field: "independent_var" },
        y: { field: "dependent_var" },
        color: { field: "experimental_condition" },
        shape: { field: "measurement_method" },
        size: { field: "sample_size" }
      }
    },
    {
      name: "error_bars",
      mark: "line", 
      encoding: {
        x: { field: "independent_var" },
        y: { field: "dependent_var" },
        color: { field: "experimental_condition" }
      }
    }
  ],
  composition: "layer"
};
```