# Configuring Fields

The Fields tab is where you set up your data for visualization, sonification, and description. This is where you define data types, select active fields, and configure transformations.

## Field Selection

When you first load data, all fields are active by default. You can:

- **Uncheck fields** you don't want to use
- **Reactivate fields** by checking them again

Only active fields will appear in descriptions and be available for encoding in visualizations and sonifications.

## Data Types

Umwelt automatically detects data types, but you can override them:

### Quantitative
- Numeric data with meaningful magnitude
- Examples: prices, temperatures, counts
- Used for: positions, sizes, continuous color scales, pitch

### Ordinal  
- Categorical data with inherent order
- Examples: ratings (1-5), sizes (S/M/L), grades
- Used for: discrete color scales, ordered positions

### Nominal
- Categorical data without inherent order  
- Examples: names, categories, types
- Used for: color groupings, shape encodings, faceting

### Temporal
- Date/time data
- Examples: timestamps, dates, years
- Used for: time axes, temporal groupings

## Key Fields

Key fields uniquely identify data rows and determine:
- **Data traversal order** for sonification playback
- **Grouping structure** for aggregations

### Automatic Detection
Umwelt automatically detects likely key fields based on:
- Data uniqueness
- Field combinations that identify rows

### Manual Reordering
You can reorder key fields to change traversal:
1. **Drag and drop** fields in the key list
2. **Primary keys** traverse first (e.g., category)
3. **Secondary keys** traverse within primary groups (e.g., time)

## Field Transformations

Each field can have transformations applied:

### Aggregation
Transform multiple values into summaries:
- **mean** - Average of values
- **median** - Middle value  
- **min/max** - Extreme values
- **sum** - Total of values
- **count** - Number of items

### Binning
Group continuous data into discrete buckets:
- Useful for creating histograms
- Reduces noise in data
- Only available for quantitative fields

### Time Units
Extract components from temporal data:
- **year, month, day** - Date components
- **hours, minutes, seconds** - Time components
- **yearmonth** - Combined year-month

## Field Definitions Panel

For each active field, you can configure:

1. **Data Type** - Override automatic detection
2. **Aggregation** - Apply summary functions
3. **Binning** - Group continuous values (quantitative only)
4. **Time Unit** - Extract temporal components (temporal only)
5. **Encodings** - See which visual/audio properties use this field

## Best Practices

### Choosing Data Types
- Use **quantitative** for true numeric measurements
- Use **ordinal** for ranked categories
- Use **nominal** for distinct groups
- Use **temporal** for any time-based data

### Key Field Strategy
- Include fields that uniquely identify observations
- Order from most general to most specific
- Consider how you want to traverse the data in audio

### Transformation Tips
- **Aggregate** when you have repeated measurements
- **Bin** to reduce noise in continuous data
- **Extract time units** to focus on patterns (e.g., seasonal)

## Common Patterns

**Time Series Data**
- Key: [category, date]
- Temporal field with time unit extraction
- Quantitative measures

**Categorical Analysis**  
- Key: [primary_category, sub_category]
- Nominal grouping fields
- Aggregated measures

**Survey Data**
- Key: [respondent_id, question_id]
- Ordinal rating scales
- Demographic nominal fields

## Next Steps

With your fields configured:
1. [Create visualizations →](/user-guide/creating-visualizations)
2. [Design sonifications →](/user-guide/creating-sonifications)