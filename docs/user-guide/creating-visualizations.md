# Creating Visualizations

The Visual tab is where you design charts and plots. Umwelt uses a grammar of graphics approach, allowing you to map data fields to visual properties.

## Visual Properties

You can map fields to these visual channels:

### Position
- **x** - Horizontal position
- **y** - Vertical position

### Mark Properties
- **color** - Hue, brightness, or categorical colors
- **size** - Area or radius of marks
- **shape** - Symbol shape (limited set)
- **opacity** - Transparency level

### Layout
- **order** - Layering order of marks
- **facet** - Split into separate subplots

## Chart Types (Marks)

Choose from these mark types:

### Point
- Individual data points as circles or symbols
- Good for: scatter plots, dot plots
- Works with: all visual properties

### Line  
- Connected data points
- Good for: time series, trends
- Best with: x/y position, color for groups

### Bar
- Rectangular bars
- Good for: categorical comparisons, histograms  
- Works with: position, color, size

### Area
- Filled regions under lines
- Good for: cumulative data, part-to-whole
- Works with: position, color, opacity

## Creating Your First Chart

1. **Add a visual unit** if none exist
2. **Choose a mark type** (point, line, bar, area)
3. **Map fields to properties**:
   - Drag fields to encoding dropdowns
   - Or use the field definition panels

### Example: Scatter Plot
- Mark: **point**
- x: **quantitative field** (e.g., height)
- y: **quantitative field** (e.g., weight)  
- color: **nominal field** (e.g., species)

### Example: Time Series
- Mark: **line**
- x: **temporal field** (e.g., date)
- y: **quantitative field** (e.g., price)
- color: **nominal field** (e.g., company)

## Multiple Visual Units

You can create multiple charts and combine them:

### Adding Units
- Click **"Add visual unit"** for additional charts
- Each unit can have different mark types and encodings
- Name units descriptively

### Composition
When you have multiple units, choose how to combine them:

**Layer**
- Overlays units in the same coordinate space
- Good for: comparing different data series
- Example: points + trend line

**Concat** 
- Places units side by side
- Good for: different views of the same data
- Example: overview + detail charts

## Encoding Configuration

For each visual property, you can configure:

### Field-Level Settings
Applied to all uses of a field:
- **Aggregation** - Summary functions
- **Binning** - Grouping continuous data
- **Time Unit** - Temporal component extraction

### Encoding-Level Settings  
Applied to specific property mappings:
- **Scale domain** - Data range to show
- **Scale range** - Visual range (colors, sizes)
- **Transform overrides** - Per-encoding transforms

## Best Practices

### Effective Mappings
- **Position (x/y)** for primary comparisons
- **Color** for categorical groupings
- **Size** for additional quantitative dimension
- **Shape** sparingly, for small categorical sets

### Chart Selection
- **Points** for correlation, distribution
- **Lines** for trends over time/order
- **Bars** for categorical comparisons
- **Areas** for cumulative or part-to-whole

### Multiple Units
- Use **layers** when units share axes
- Use **concat** for different perspectives
- Keep units focused and purposeful

## Common Patterns

**Correlation Analysis**
- Mark: point
- x/y: quantitative fields
- color: grouping variable

**Time Trend**
- Mark: line  
- x: temporal (often with time unit)
- y: quantitative measure
- color: category groupings

**Categorical Comparison**
- Mark: bar
- x: nominal categories
- y: quantitative (often aggregated)
- color: sub-categories

**Distribution**
- Mark: point or bar
- x: binned quantitative field
- y: count (aggregated)

## Troubleshooting

**Chart doesn't appear**
- Check that required fields are mapped (usually x and y)
- Verify field data types are appropriate
- Ensure data has values for mapped fields

**Unexpected appearance**
- Check aggregation settings
- Verify scale domains and ranges
- Review data type assignments

**Performance issues**
- Consider aggregating large datasets
- Use binning for high-cardinality data
- Limit number of visual units

## Next Steps

With visualizations created:
1. [Add sonifications →](/user-guide/creating-sonifications)
2. [Configure playback →](/user-guide/playback-controls)