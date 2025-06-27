# Fire Hexbin Maker

## What is Fire Hexbin Maker?

Fire Hexbin Maker is a _vibe-coded_ web-based tool that converts point data (like fire locations) into hexagonal grid visualizations.

Please, check your outputs. You know those LLMs can never be trusted.

## How it Works

**Disclaimer:** This description was written by an AI agent and revised by me. While I've done my best to filter out hallucinations, please verify any technical details independently.


### 1. Upload Your Data
- Upload a CSV file containing latitude and longitude coordinates
- The tool supports up to 500,000 data points
- Your CSV must have columns named 'latitude' and 'longitude' (case-insensitive)
- Coordinates should be numeric: latitude (-90 to 90), longitude (-180 to 180)

### 2. Select Your Area
- Draw a rectangle on the map to define your analysis area
- Or upload a GeoJSON file with custom boundaries
- Only points within this area will be processed

### 3. Configure Hexagons and Bins
- **Hexagon Size**: Choose H3 resolution level (0-15)
  - Level 0 = largest hexagons (continental scale)
  - Level 15 = smallest hexagons (building scale)
  - Default starts at Level 2 for good performance
- **Color Bins**: Define how to group hexagons by point count
  - Set points per category (e.g., 10 points per bin)
  - Set total number of color categories (e.g., 10 bins)
  - Preview shows how your data will be colored

### 4. Preview and Download
- See your hexagon map with color-coded bins
- View a histogram showing data distribution
- Download as a single GeoJSON file or separate files per bin
- Files include metadata about your processing parameters

## Processing Steps

### Data Validation
- Validates CSV format and required columns
- Checks coordinate ranges and data types
- Filters out invalid or missing coordinates
- Reports data quality issues to the user

### Spatial Filtering
- Applies user-defined geographic boundaries
- Uses point-in-polygon algorithms for custom areas
- Supports both rectangular and complex polygon boundaries
- Only processes points within the selected area

### H3 Hexagon Assignment
- Converts latitude/longitude coordinates to H3 hexagon indices
- Uses the selected resolution level to determine hexagon size
- Groups all points within each hexagon
- Counts the number of points per hexagon

### Binning and Color Assignment
- Creates user-defined bins based on point counts
- Assigns each hexagon to a color category
- Uses Viridis color scale for consistent visualization
- Handles edge cases like empty hexagons and outliers

### Output Generation
- Creates GeoJSON features for each hexagon
- Includes metadata: point count, bin assignment, H3 index
- Generates histogram data for distribution analysis
- Provides both single-file and multi-file download options

## Technical Details

- **Hexagon System**: Uses Uber's H3 geospatial indexing system
- **Color Scale**: Viridis color palette (colorblind-friendly)
- **File Format**: GeoJSON output with embedded metadata
- **Performance**: Optimized for datasets up to 500,000 points


## Browser Compatibility

Works in modern browsers with JavaScript enabled. No installation required - just upload your data and start visualizing.
