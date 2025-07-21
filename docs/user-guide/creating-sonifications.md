# Creating Sonifications

The Audio tab is where you design sonifications - mappings from data to sound. Umwelt converts your data into audio representations that can be played back sequentially.

## Audio Properties

You can map fields to these audio channels:

### Pitch
- **Frequency** of sound (high/low)
- Maps well to: quantitative data with clear ordering
- Examples: temperatures, prices, ratings

### Duration
- **Length** of each sound event
- Maps well to: quantitative measures, emphasis
- Examples: sales volume, population size

### Volume
- **Loudness** of sound
- Maps well to: quantitative emphasis data
- Examples: confidence scores, magnitudes

## Creating Audio Units

Audio units are independent sonification voices that can play simultaneously or sequentially.

### Adding Units
1. **Click "Add audio unit"** to create a new voice
2. **Map fields to audio properties** using dropdowns
3. **Configure traversal order** (see below)

### Example: Simple Sonification
- **pitch**: price (quantitative)
- **duration**: constant or another measure
- **traversal**: [company, date]

This would play each company's price trends in sequence.

## Data Traversal

Traversal determines the order in which data points are played:

### Key Field Order
The traversal follows your key fields:
- **Primary key** creates major groups (e.g., different companies)
- **Secondary key** orders within groups (e.g., time sequence)

### Reordering Traversal
You can customize traversal for each audio unit:
1. **Drag fields** in the traversal list
2. **Add/remove fields** from traversal
3. **Configure field transforms** (binning, time units)

### Traversal Strategy
- **Categorical first** for grouped playback (all of category A, then B)
- **Temporal second** for time-ordered sequences within groups
- **Keep it simple** - too many traversal fields can be confusing

## Audio Unit Configuration

### Field Mappings
- **Required**: At least one audio property (pitch, duration, or volume)
- **Optional**: Additional properties for richer sonification
- **Encoding-level transforms**: Override field-level settings per property

### Traversal Settings
- **Field order**: Drag to reorder traversal sequence
- **Binning**: Group continuous traversal fields
- **Time units**: Extract temporal components for traversal

## Multiple Audio Units

You can create multiple audio units for complex sonifications:

### Composition Types

**Concat** (Sequential)
- Units play one after another
- Good for: comparing different data aspects
- Example: prices then volumes

**Layer** (Simultaneous)  
- Not implemented yet! Check back later.

## Best Practices

### Effective Audio Mappings
- **Pitch** for primary quantitative comparisons
- **Duration** for emphasis or secondary measures  
- **Volume** sparingly, as it can mask other audio cues

### Traversal Design
- **Group related data** with primary traversal fields
- **Use temporal order** when data has time component
- **Keep traversal predictable** for listener comprehension

### Multiple Units
- **Use concat** for sequential comparison of different aspects
- **Use layer** when units complement each other harmonically
- **Avoid too many simultaneous units** (can become cacophonous)

## Sonification Patterns

**Time Series**
- pitch: quantitative measure (e.g., stock price)
- traversal: [category, date]
- Result: Each category's trend played in sequence

**Categorical Comparison**
- pitch: aggregated measure (e.g., mean rating)
- duration: count or confidence
- traversal: [category]
- Result: Categories compared by pitch height

**Multi-dimensional**
- Unit 1 - pitch: measure A, traversal: [group, time]
- Unit 2 - pitch: measure B, traversal: [group, time]  
- Composition: layer
- Result: Two measures played as harmony

**Geographic**
- pitch: quantitative measure
- duration: secondary measure
- traversal: [region, sub-region]
- Result: Regional patterns with nested sub-regions

## Troubleshooting

**No audio plays**
- Check that at least one audio property is mapped
- Verify traversal fields are configured
- Ensure browser audio permissions are enabled

**Confusing playback**
- Simplify traversal order
- Reduce number of simultaneous audio units
- Check for data anomalies (extreme values)

**Poor audio quality**
- Verify quantitative fields have appropriate ranges
- Check for missing or invalid data values
- Consider aggregation for noisy data

## Next Steps

With sonifications created:
1. [Configure playback controls →](/user-guide/playback-controls)  
2. [Learn about accessibility features →](/user-guide/accessibility)