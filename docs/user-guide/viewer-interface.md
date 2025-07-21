# Viewer Interface

The Viewer panel (right side) is where you experience your multimodal data representations. Umwelt is designed primarily for screen reader users, providing three coordinated ways to explore your data: visual, textual, and audio. All functionality is fully accessible via keyboard navigation and works seamlessly with assistive technologies.

## Overview

The viewer contains three main sections:

### Visualization
- **Rendered charts** from your visual specifications
- **Interactive highlighting** and selection
- **Real-time updates** as you modify the editor

### Description  
- **Accessible textual structure** using Olli (accessible visualization library)
- **Hierarchical navigation** of chart elements
- **Screen reader compatible** descriptions

### Sonification
- **Audio playback controls** for your sonifications
- **Coordinated highlighting** with visual elements
- **Speech synthesis** for data point announcements

## Visualization Section

### Interactive Features

**Selection and Highlighting**
- **Click data points** to highlight across all modalities
- **Hover effects** show data values and context
- **Selection persistence** maintains focus across interactions

**Zoom and Pan**
- **Mouse wheel** or trackpad for zooming
- **Click and drag** to pan around large visualizations
- **Reset view** returns to original scale

**Multi-unit Coordination**
- **Synchronized highlighting** across multiple visual units
- **Shared color scales** maintain consistency
- **Coordinated interactions** between layered or concatenated charts

### Visual Feedback
- **Loading indicators** during data processing
- **Error messages** for invalid specifications
- **Update animations** when editor changes are applied

## Textual Structure (Olli Integration)

### Hierarchical Navigation

The textual description provides a structured way to explore your visualization:

**Chart Level**
- **Overall description** of the visualization type and data
- **Key insights** and patterns automatically detected
- **Navigation menu** to chart components

**Series Level**  
- **Individual data series** (groups, categories)
- **Summary statistics** for each series
- **Trend descriptions** and comparisons

**Data Point Level**
- **Individual observations** with precise values
- **Context information** (position in series, relationships)
- **Detailed metadata** for each point

### Screen Reader Navigation

**Keyboard Controls**
- **Tab/Shift+Tab** to move between structural elements
- **Arrow keys** to navigate within data series  
- **Enter** to select and hear more details about elements
- **F6** to cycle between main interface sections
- **Escape** to exit current context or stop audio

**Announcement Patterns**
- **Structured reading** follows logical data hierarchy
- **Value announcements** include units and context
- **Relationship descriptions** explain data connections
- **Live regions** announce updates without disrupting navigation

**Screen Reader Compatibility**
Umwelt has been tested most thoroughly with VoiceOver on Mac. However, it supports all major screen readers:
- **VoiceOver** (macOS)
- **NVDA** (Windows)
- **JAWS** (Windows)

**Customizable Verbosity**
- **Summary mode** for quick overview
- **Detailed mode** for comprehensive exploration
- **Custom focus** on specific data aspects

## Sonification Section

### Audio Playback Controls

**Individual Unit Controls**
- **Play/Pause buttons** for each audio unit
- **Visual indicators** showing playback status
- **Independent control** of multiple sonification voices

**Global Controls**
- **Master play/pause** for all units
- **Stop all** to immediately halt playback
- **Composition-aware** (sequential or simultaneous playback)

### Playback Configuration

**Speed Control**
- **Playback rate slider** (0.1x to 4.0x speed)
- **Real-time adjustment** during playback
- **Optimal speeds** for different listening purposes

**Audio Quality**
- **Mute/Unmute toggle** for all audio
- **Volume consistency** across different data ranges
- **Clear audio synthesis** for reliable pitch perception

### Speech Integration

**Data Announcements**
- **"Speak axis ticks" checkbox** enables/disables announcements
- **Key field values** spoken before each data point
- **Speech rate control** (1-100 scale) for announcement speed

**Coordination with Sonification**
- **Synchronized timing** between speech and audio
- **Pause-aware** speech that respects playback controls
- **Context-sensitive** announcements based on traversal

## Cross-Modal Coordination

### Selection Highlighting

**Visual-Audio Coordination**
- **Playing data points** highlighted in visualization
- **Visual selection** triggers corresponding audio cues
- **Synchronized traversal** across all modalities

**Text-Visual Coordination**
- **Textual navigation** highlights corresponding visual elements
- **Visual interaction** updates textual focus
- **Shared selection state** across all representations

### Data Exploration Workflows

**Visual-First Exploration**
1. **Examine visualization** for overall patterns
2. **Click interesting points** for detailed information
3. **Use text description** for precise values
4. **Play sonification** to hear temporal patterns

**Audio-First Exploration**
1. **Start sonification playback** to hear data patterns
2. **Watch visual highlighting** to see current position
3. **Pause at interesting sounds** for visual examination
4. **Use text navigation** for detailed exploration

**Text-First Exploration**
1. **Navigate textual structure** with keyboard
2. **Focus on data series** of interest
3. **Visual highlighting** shows current textual focus
4. **Play corresponding audio** for the selected data

## Accessibility Features

### Universal Design
- **Multiple modalities** provide redundant access to same information
- **Keyboard navigation** available for all interactions
- **Screen reader compatibility** throughout interface

### Customization Options
- **Adjustable playback speeds** for different cognitive needs
- **Configurable speech rates** for comfortable listening
- **Visual highlighting options** for different vision needs

### Error Handling
- **Graceful degradation** when technologies aren't available
- **Clear error messages** with suggested solutions
- **Alternative access methods** when primary interaction fails

## Performance Considerations

### Large Datasets
- **Progressive rendering** for complex visualizations
- **Efficient audio synthesis** for long sonifications
- **Responsive text generation** for large data structures

### Browser Compatibility
- **Modern browser features** with fallbacks
- **Audio permission handling** for autoplay policies
- **Cross-platform consistency** in experience

## Troubleshooting

**Visualization Issues**
- **Refresh viewer** if charts don't update
- **Check console** for JavaScript errors
- **Verify data** has valid values for mapped properties

**Audio Problems**
- **Click any play button** to enable browser audio
- **Check system audio** settings and connections
- **Try different browsers** if synthesis fails

**Text Navigation Issues**
- **Use Tab key** to enter text structure
- **Check screen reader** settings and compatibility
- **Try keyboard navigation** if mouse interactions fail

**Coordination Problems**
- **Pause and restart** to resynchronize modalities
- **Check that all modalities** use same data specification
- **Refresh page** if persistent coordination issues occur

## Next Steps

With the viewer interface mastered:
1. [Explore interactive examples →](/examples/)
2. [Learn about advanced sonification →](/examples/advanced-sonification)