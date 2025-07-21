# Uploading Data

The Data tab is where you manage datasets for use in Umwelt. You can upload your own files or choose from example datasets.

## Supported Formats

Umwelt accepts:
- **CSV files** - Comma-separated values with headers
- **JSON files** - Array of objects with consistent structure

## Uploading Your Data

1. **Go to the Data tab** in the editor panel
2. **Choose "Upload JSON or CSV file"**
3. **Select your file** using the file picker
4. **Preview your data** in the data table

Your uploaded file will appear in the "Recently uploaded files" section for future use.

Note: Data is stored locally, in your browser's local storage. It does not leave your computer and is not uploaded to any server.

## Data Requirements

For best results, ensure your data:
- **Has column headers** - First row should contain field names
- **Is consistently formatted** - Each row should have the same structure
- **Contains clean values** - Avoid mixed data types in columns
- **Is reasonably sized** - Large datasets may impact performance

## Example Datasets

Umwelt includes several example datasets:

- **stocks.csv** - Stock prices over time (temporal + quantitative)
- **cars.json** - Car specifications (mixed data types)
- **weather.csv** - Weather measurements (temporal + multiple measures)
- **penguins.json** - Palmer penguin data (categorical + quantitative)

These examples demonstrate different data patterns and are great for learning.

## Data Preview

Once loaded, your data appears in a table showing:
- **All columns** from your dataset
- **Formatted values** based on detected data types
- **First several rows** to verify correct loading

## Managing Datasets

- **Switch between datasets** using radio buttons
- **Remove recent files** with the "Remove" button
- **Reload example datasets** anytime

## Common Issues

**File won't upload**
- Check that your file is CSV or JSON format
- Ensure CSV has proper headers in the first row
- Verify JSON is an array of objects

**Data looks wrong**
- Check for encoding issues (UTF-8 recommended)
- Ensure consistent data types within columns
- Look for missing or malformed values

**Performance issues**
- Try with a smaller sample of your data first
- Consider aggregating very large datasets

## Next Steps

Once your data is loaded:
1. [Configure your fields →](/user-guide/configuring-fields)
2. [Create your first visualization →](/user-guide/creating-visualizations)