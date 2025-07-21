# Developer Reference

This section provides technical documentation for developers who want to write or programmatically generate Umwelt specs and embed multimodal data representations in their own applications.

## Core Concepts

Umwelt uses a declarative specification system that generates coordinated visual, textual, and audio representations from a single JSON-serializable object.

### The UmweltSpec
Everything in Umwelt is defined by an `UmweltSpec` - a JavaScript object that completely describes:
- Your data and how fields should be interpreted
- Visual representations (charts) using grammar of graphics
- Audio representations (sonifications) with data-to-sound mappings
- Data traversal patterns for sequential audio playback

## Key Documentation

### Core Specification
- **[UmweltSpec →](./umwelt-spec)** - Complete specification structure and examples
- **[Field Definitions →](./field-definitions)** - Configure data fields with types and transformations

### Visual Output
- **[Visual Encodings →](./visual-encodings)** - Map data fields to chart properties (position, color, size)

### Audio Output  
- **[Audio Encodings →](./audio-encodings)** - Map data fields to sound properties (pitch, duration, volume)

### Integration
- **[Contexts →](./contexts)** - React/SolidJS integration patterns for embedding

## Common Use Cases

### Data Analysis Pipelines
Generate UmweltSpecs programmatically from:
- Jupyter notebooks and data science workflows
- Business intelligence dashboards
- Automated report generation
- Research data analysis scripts

### Application Integration
Embed multimodal representations in:
- Web applications and dashboards
- Accessibility-focused data tools
- Educational platforms and tutorials
- Scientific computing interfaces

### Configuration-Driven UIs
Use UmweltSpecs as:
- Saved visualization configurations
- User preference storage
- Template systems for common patterns
- API responses for dynamic dashboards

## Specification Examples

### Basic Scatter Plot
```typescript
const spec: UmweltSpec = {
  data: {
    values: [
      { x: 1, y: 2, category: "A" },
      { x: 2, y: 4, category: "B" },
      // ... more data
    ]
  },
  fields: [
    { active: true, name: "x", type: "quantitative", encodings: [] },
    { active: true, name: "y", type: "quantitative", encodings: [] },
    { active: true, name: "category", type: "nominal", encodings: [] }
  ],
  key: ["category"],
  visual: {
    units: [{
      name: "scatter",
      mark: "point",
      encoding: {
        x: { field: "x" },
        y: { field: "y" },
        color: { field: "category" }
      }
    }],
    composition: "layer"
  },
  audio: {
    units: [{
      name: "sonification",
      encoding: {
        pitch: { field: "y" }
      },
      traversal: [{ field: "category" }, { field: "x" }]
    }],
    composition: "concat"
  }
};
```

### Time Series with Sonification
```typescript
const timeSeriesSpec: UmweltSpec = {
  data: {
    values: stockData, // Array of {date, price, symbol}
    name: "stocks"
  },
  fields: [
    { 
      active: true, 
      name: "date", 
      type: "temporal", 
      timeUnit: "yearmonth" 
    },
    { 
      active: true, 
      name: "price", 
      type: "quantitative", 
    },
    { 
      active: true, 
      name: "symbol", 
      type: "nominal",
    }
  ],
  key: ["symbol", "date"],
  visual: {
    units: [{
      name: "line_chart",
      mark: "line",
      encoding: {
        x: { field: "date" },
        y: { field: "price" },
        color: { field: "symbol" }
      }
    }],
    composition: "layer"
  },
  audio: {
    units: [{
      name: "price_sonification",
      encoding: {
        pitch: { field: "price" }
      },
      traversal: [{ field: "symbol" }, { field: "date" }]
    }],
    composition: "concat"
  }
};
```

## Advanced Topics

### Custom Field Transformations
- Aggregation strategies for large datasets
- Binning continuous data for categorical treatment
- Time unit extraction for temporal analysis

### Multi-Unit Compositions
- Layered visual units for complex comparisons
- Sequential audio units for narrative sonification
- Coordinated highlighting across modalities

### Performance Considerations
- Data size limits and sampling strategies
- Browser audio capabilities and fallbacks
- Progressive rendering for large specifications

## API Reference

Complete TypeScript definitions and detailed API documentation for each specification component:

1. **[UmweltSpec Structure →](./umwelt-spec)**
2. **[Field Configuration →](./field-definitions)**  
3. **[Visual Encoding Options →](./visual-encodings)**
4. **[Audio Encoding Options →](./audio-encodings)**

## Getting Help

- **GitHub Issues** for questions about programmatic generation
- **Examples Repository** for common specification patterns
- **TypeScript Definitions** provide inline API documentation
- **Community Discord** for real-time developer support