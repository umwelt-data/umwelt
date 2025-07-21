# UmweltSpec

The `UmweltSpec` is the central abstraction that defines a complete multimodal data representation. Understanding its structure and the relationships between its components is essential for programmatic generation of accessible data experiences.

## Conceptual Overview

An UmweltSpec represents a complete data analysis workflow that transforms raw data into three coordinated representations:

1. **Data Layer** - Your raw dataset with field metadata
2. **Specification Layer** - Declarations of how fields map to perceptual properties
3. **Output Layer** - Generated visual, textual, and audio representations

The key insight is that all three output modalities are generated from the same declarative specification, ensuring perfect coordination between what users see, hear, and navigate with screen readers.

## Core Structure

```typescript
interface UmweltSpec {
  data: UmweltDataSource;      // Raw data + metadata
  fields: FieldDef[];          // Field configurations
  key: FieldName[];            // Data traversal structure
  visual: VisualSpec;          // Visual encoding declarations
  audio: AudioSpec;            // Audio encoding declarations
}
```

## Data Foundation

### Data Source Concept
The `data` section contains your raw dataset along with optional metadata. Umwelt treats data as an array of objects where each object represents one observation (row) and each property represents a measured or categorical variable (column).

The data structure is intentionally simple - it's just JSON objects that could come from CSV files, database queries, API responses, or any other tabular data source. This simplicity enables Umwelt to work with data from any domain without requiring special formatting.

### Field Definition Philosophy
The `fields` array is where you provide semantic information about your data that Umwelt can't automatically detect. While Umwelt can infer that a column contains numbers or strings, it can't know whether those numbers represent measurements (quantitative), rankings (ordinal), or discrete codes (nominal).

Each field definition tells Umwelt:
- **What kind of data this is** (quantitative, ordinal, nominal, temporal)
- **How to transform it** (aggregation, binning, time unit extraction)
- **Which perceptual properties use it** (visual properties like position and color, audio properties like pitch and duration)

This semantic layer is what enables Umwelt to generate meaningful representations rather than just plotting raw numbers.

## Key Field Strategy

### Data Traversal Logic
The `key` array defines the logical structure of your data for sequential processing. This is crucial for audio sonification, where data must be played back in some order, but it also affects how data is grouped and aggregated throughout the system.

Think of key fields as defining a hierarchy: the first key field creates major groups, the second key field creates subgroups within each major group, and so on. This hierarchy determines:
- **Audio playback order** - sonification plays all data for group 1, then group 2, etc.
- **Text navigation structure** - screen readers navigate through the same logical hierarchy
- **Aggregation boundaries** - summary statistics are calculated within these groups

## Visual Specification Concepts

### Grammar of Graphics Integration
The visual specification uses a grammar of graphics approach where you declare mappings between data fields and visual properties rather than imperatively drawing specific chart elements.

### Unit-Based Architecture
Visual specs support multiple "units" (individual charts) that can be combined through composition. This enables complex dashboard-like layouts while maintaining the declarative approach:
- **Layered composition** overlays multiple units in the same coordinate space
- **Concatenated composition** places units side by side
- **Each unit** can have different mark types and encodings

### Encoding Philosophy
Visual encodings map data fields to perceptual properties like position, color, and size. The same field can be mapped to multiple properties, and the same property can be used across multiple visual units. This flexibility enables rich, coordinated visualizations while maintaining the single-source-of-truth principle.

## Audio Specification Concepts

### Sonification as Data Representation
Audio specifications define a mapping from data to audio properties that follows the same declarative principles as visual mappings.

### Traversal vs. Encoding
Audio specs separate two concerns:
- **Encoding** maps data fields to audio properties (pitch, duration, volume)
- **Traversal** defines the order in which data points are played

This separation enables sophisticated sonification strategies where the playback order can be different from the data order, and multiple audio units can have different traversal patterns while sharing the same data.

### Temporal Nature of Audio
Unlike visual representations that can be perceived all at once, audio unfolds over time. This temporal constraint makes traversal order crucial and enables narrative-like data experiences where patterns emerge through sequential listening.

## Coordination and Consistency

### Single Source of Truth
The UmweltSpec serves as the single source of truth for all representations. Changes to field definitions, encodings, or data automatically propagate to all output modalities. This ensures that visual, textual, and audio representations never become inconsistent.

### Cross-Modal Linking
The specification system enables sophisticated coordination between modalities:
- **Selection in one modality** highlights corresponding elements in others
- **Navigation through text** shows position in visual representations
- **Audio playback** highlights current data points visually

### State Management
While the UmweltSpec itself is immutable, the application maintains additional state for user interactions (selections, playback position, UI focus). This separation keeps the core specification clean while enabling rich interactive experiences.