// Hexbin Maker - Main Application Logic
import * as h3 from "https://esm.sh/h3-js@4.1.0";
import * as turf from "https://esm.sh/@turf/turf@6.5.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

// App State Management
class AppState {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.csvData = null;
    this.spatialFilter = null;
    this.processedData = null;
    this.resolution = 2;
    this.binStep = 10;
    this.binCount = 10;
    this.maps = {};
    this.drawControl = null;
    this.drawnItems = null;
    this.hexagonLayer = null;
    this.drawingLayer = null;
    this.geojsonLayer = null;
    this.customColors = {}; // Store user-selected legend colors by bin label
  }

  updateProgress() {
    const progress = (this.currentStep / this.totalSteps) * 100;
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
  }

  goToStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.step').forEach(step => {
      step.classList.remove('active');
    });

    // Show target step
    const targetStep = document.getElementById(`step-${this.getStepName(stepNumber)}`);
    if (targetStep) {
      targetStep.classList.add('active');
      this.currentStep = stepNumber;
      this.updateProgress();
      
      // Validate current step state
      validateCurrentStep();
      
      // Initialize step-specific functionality
      if (stepNumber === 3) {
        // Initialize area selection step
        setTimeout(() => initializeAreaStep(), 100);
      } else if (stepNumber === 4) {
        // Initialize resolution step and trigger processing
        console.log('📊 Entering resolution step - triggering data processing...');
        setTimeout(() => {
          initializeResolutionStep();
          processData();
        }, 100);
      }
    }
  }

  getStepName(stepNumber) {
    const stepNames = {
      1: 'start',
      2: 'upload',
      3: 'area',
      4: 'resolution',
      5: 'download'
    };
    return stepNames[stepNumber];
  }
}

// Initialize app
const app = new AppState();

// DOM Elements
const elements = {
  startButton: document.getElementById('start-button'),
  backToStart: document.getElementById('back-to-start'),
  nextToArea: document.getElementById('next-to-area'),
  backToUpload: document.getElementById('back-to-upload'),
  nextToResolution: document.getElementById('next-to-resolution'),
  backToArea: document.getElementById('back-to-area'),
  nextToDownload: document.getElementById('next-to-download'),
  restartProcess: document.getElementById('restart-process'),
  backToResolution: document.getElementById('back-to-resolution'),
  csvUpload: document.getElementById('csv-upload'),
  uploadArea: document.getElementById('upload-area'),
  uploadGeojson: document.getElementById('upload-geojson'),
  geojsonUpload: document.getElementById('geojson-upload'),
  resolution: document.getElementById('resolution'),
  resValue: document.getElementById('res-value'),
  resArea: document.getElementById('res-area'),
  binStep: document.getElementById('bin-step'),
  binCount: document.getElementById('bin-count'),
  downloadSingle: document.getElementById('download-single'),
  downloadMulti: document.getElementById('download-multi'),
  hexCount: document.getElementById('hex-count'),
  fileSize: document.getElementById('file-size')
};

// H3 Area calculations
const h3Areas = {
  0: 4357449.416,  1: 609788.442,  2: 86801.780,  3: 12393.435,
  4: 1770.348,     5: 252.904,     6: 36.129,     7: 5.161,
  8: 0.737,        9: 0.105,       10: 0.015,     11: 0.002,
  12: 0.0003,      13: 0.00004,    14: 0.000006,  15: 0.000001
};

// Constants
const MAX_ROWS = 500000;
const MAX_HEXAGONS = 5000;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();
  setTimeout(() => {
    const legendCopyBtn = document.getElementById('copy-legend-html');
    if (legendCopyBtn) {
      legendCopyBtn.addEventListener('click', copyLegendAsHTML);
    }
  }, 500); // Wait for DOM and legend to be present
  setupBinInputValidation();
});

function initializeApp() {
  // Set initial progress
  app.updateProgress();
  
  // Initialize resolution display
  updateResolutionDisplay();
  
  // Ensure buttons are properly disabled initially
  disableNextButton(elements.nextToArea);
  disableNextButton(elements.nextToResolution);
  disableNextButton(elements.nextToDownload);
  
  // Clear any cached form data
  clearFormCache();
}

function clearFormCache() {
  // Clear file inputs
  if (elements.csvUpload) elements.csvUpload.value = '';
  if (elements.geojsonUpload) elements.geojsonUpload.value = '';
  
  // Reset form inputs to defaults
  if (elements.resolution) elements.resolution.value = '2';
  if (elements.binStep) elements.binStep.value = '10';
  if (elements.binCount) elements.binCount.value = '10';
  
  // Clear any cached data
  app.csvData = null;
  app.spatialFilter = null;
  app.processedData = null;
  
  console.log('🧹 Form cache cleared');
}

function setupEventListeners() {
  // Navigation buttons with validation
  elements.startButton?.addEventListener('click', () => app.goToStep(2));
  elements.backToStart?.addEventListener('click', () => app.goToStep(1));
  elements.nextToArea?.addEventListener('click', () => {
    if (app.csvData) {
      app.goToStep(3);
    } else {
      showError('Please upload a CSV file first');
    }
  });
  elements.backToUpload?.addEventListener('click', () => app.goToStep(2));
  elements.nextToResolution?.addEventListener('click', () => {
    if (app.spatialFilter) {
      app.goToStep(4);
    } else {
      showError('Please select an area first (draw rectangle or upload GeoJSON)');
    }
  });
  elements.backToArea?.addEventListener('click', () => app.goToStep(3));
  elements.nextToDownload?.addEventListener('click', () => {
    if (app.processedData) {
      app.goToStep(5);
    } else {
      showError('Please wait for data processing to complete');
    }
  });
  elements.restartProcess?.addEventListener('click', restartApp);
  elements.backToResolution?.addEventListener('click', () => app.goToStep(4));

  // File uploads
  elements.csvUpload?.addEventListener('change', handleCSVUpload);
  elements.uploadArea?.addEventListener('click', () => elements.csvUpload?.click());
  elements.uploadArea?.addEventListener('dragover', handleDragOver);
  elements.uploadArea?.addEventListener('drop', handleDrop);
  elements.uploadArea?.addEventListener('dragleave', handleDragLeave);

  // Area selection
  elements.uploadGeojson?.addEventListener('click', () => elements.geojsonUpload?.click());
  elements.geojsonUpload?.addEventListener('change', handleGeoJSONUpload);

  // Resolution controls
  elements.resolution?.addEventListener('input', handleResolutionChange);
  elements.binStep?.addEventListener('input', handleBinChange);
  elements.binCount?.addEventListener('input', handleBinChange);

  // Downloads
  elements.downloadSingle?.addEventListener('click', downloadSingleFile);
  elements.downloadMulti?.addEventListener('click', downloadMultiFiles);
}

// CSV Upload Handling
function handleCSVUpload(event) {
  const file = event.target.files[0];
  if (file) {
    console.log('📁 CSV file selected:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    processCSVFile(file);
  }
}

function handleDragOver(event) {
  event.preventDefault();
  elements.uploadArea?.classList.add('dragover');
}

function handleDragLeave(event) {
  event.preventDefault();
  elements.uploadArea?.classList.remove('dragover');
}

function handleDrop(event) {
  event.preventDefault();
  elements.uploadArea?.classList.remove('dragover');
  
  const files = event.dataTransfer.files;
  if (files.length > 0 && files[0].type === 'text/csv') {
    console.log('📁 CSV file dropped:', files[0].name, 'Size:', (files[0].size / 1024 / 1024).toFixed(2), 'MB');
    processCSVFile(files[0]);
  }
}

function processCSVFile(file) {
  console.log('🔄 Starting CSV processing...');
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const csvText = e.target.result;
      console.log('📄 CSV text loaded, length:', csvText.length, 'characters');
      console.log('📄 First 500 characters:', csvText.substring(0, 500));
      
      // Use d3.csvParse for comma-separated CSV files
      const data = d3.csvParse(csvText);
      
      if (!data.columns) {
        throw new Error('Could not read columns from CSV.');
      }
      // Check for required columns (case-insensitive, trimmed)
      const normalizedColumns = data.columns.map(c => c.trim().toLowerCase());
      const hasLat = normalizedColumns.includes('latitude');
      const hasLon = normalizedColumns.includes('longitude');
      if (!hasLat || !hasLon) {
        showError(
          'CSV must contain columns named "latitude" and "longitude" (case-insensitive, no extra spaces). Columns found: ' + data.columns.join(', ')
        );
        throw new Error('Missing required columns.');
      }
      if (validateCSVData(data)) {
        app.csvData = data;
        console.log('✅ CSV data successfully loaded!');
        console.log('📊 Data summary:', {
          totalRows: data.length,
          sampleRow: data[0],
          columns: Object.keys(data[0]),
          firstFewRows: data.slice(0, 3)
        });
        updateUploadSuccess(file.name, data.length);
        enableNextButton(elements.nextToArea);
      }
    } catch (error) {
      console.error('❌ Error processing CSV file:', error);
      // showError already called above if missing columns
      if (!error.message.includes('Missing required columns.')) {
        showError('Error processing CSV file: ' + error.message);
      }
    }
  };
  
  reader.readAsText(file);
}

function validateCSVData(data) {
  console.log('🔍 Validating CSV data...');
  
  if (data.length === 0) {
    console.error('❌ CSV file is empty');
    showError('CSV file is empty');
    return false;
  }
  
  console.log('📊 Row count:', data.length, 'Max allowed:', MAX_ROWS);
  if (data.length > MAX_ROWS) {
    console.error('❌ Too many rows:', data.length, '>', MAX_ROWS);
    showError(`CSV has ${data.length} rows, but maximum allowed is ${MAX_ROWS.toLocaleString()}`);
    return false;
  }
  
  // Validate coordinates
  console.log('🔍 Validating coordinates...');
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const lat = parseFloat(data[i].latitude);
    const lon = parseFloat(data[i].longitude);
    
    console.log(`📍 Row ${i}: lat=${lat}, lon=${lon}`);
    
    if (isNaN(lat) || isNaN(lon)) {
      console.error('❌ Invalid coordinates at row', i, data[i]);
      showError('Invalid coordinates found in CSV');
      return false;
    }
    
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.error('❌ Coordinates out of range at row', i, 'lat:', lat, 'lon:', lon);
      showError('Coordinates out of valid range (lat: -90 to 90, lon: -180 to 180)');
      return false;
    }
  }
  
  console.log('✅ CSV validation passed!');
  return true;
}

// Area Selection
function initializeMap() {
  if (!app.maps.area) {
    console.log('🗺️ Initializing area selection map...');
    app.maps.area = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(app.maps.area);
    
    app.drawnItems = new L.FeatureGroup();
    app.maps.area.addLayer(app.drawnItems);
    
    app.drawControl = new L.Control.Draw({
      draw: {
        rectangle: true,
        polygon: false,
        polyline: false,
        circle: false,
        marker: false,
        circlemarker: false
      },
      edit: false // Disable edit controls since we handle editing differently
    });
    app.maps.area.addControl(app.drawControl);
    
    // Handle drawing events
    app.maps.area.on('draw:created', handleDrawCreated);
    
    console.log('✅ Area selection map initialized');
  }
}

function enableDrawing() {
  console.log('✏️ Enabling drawing mode...');
  initializeMap();
  
  // Clear existing drawings and GeoJSON layers
  clearAreaSelection();
  
  // Don't update UI until rectangle is actually drawn
}

function handleDrawCreated(event) {
  console.log('📐 Rectangle drawn');
  const layer = event.layer;
  
  // Clear any existing GeoJSON layers
  clearGeoJSONLayers();
  
  // Clear any existing drawn items (ensure only one rectangle)
  app.drawnItems.clearLayers();
  
  app.drawnItems.addLayer(layer);
  app.spatialFilter = layer.getBounds();
  
  // Make the rectangle immediately editable
  const editControl = new L.EditToolbar.Edit(app.maps.area, {
    featureGroup: app.drawnItems
  });
  
  // Enable editing mode immediately
  editControl.enable();
  
  // Add edit event listener
  layer.on('edit', function(e) {
    console.log('✏️ Rectangle edited');
    const editedLayer = e.target;
    app.spatialFilter = editedLayer.getBounds();
    
    // Update bounding box display
    const bounds = editedLayer.getBounds();
    const coords = {
      north: bounds.getNorth().toFixed(4),
      south: bounds.getSouth().toFixed(4),
      east: bounds.getEast().toFixed(4),
      west: bounds.getWest().toFixed(4)
    };
    
    console.log('📍 Updated bounding box coordinates:', coords);
    showBoundingBoxInfo(coords);
  });
  
  // Show bounding box coordinates
  const bounds = layer.getBounds();
  const coords = {
    north: bounds.getNorth().toFixed(4),
    south: bounds.getSouth().toFixed(4),
    east: bounds.getEast().toFixed(4),
    west: bounds.getWest().toFixed(4)
  };
  
  console.log('📍 Bounding box coordinates:', coords);
  showBoundingBoxInfo(coords);
  
  // Reset upload button to original state
  updateAreaControls('drawn');
  enableNextButton(elements.nextToResolution);
}

function handleGeoJSONUpload(event) {
  const file = event.target.files[0];
  if (file) {
    console.log('📁 GeoJSON file selected:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const geojson = JSON.parse(e.target.result);
        console.log('🗺️ GeoJSON loaded:', geojson.type);
        
        // Clear any existing drawings
        clearAreaSelection();
        
        // Add GeoJSON to map
        addGeoJSONToMap(geojson);
        
        app.spatialFilter = geojson;
        updateAreaControls('geojson', file.name);
        enableNextButton(elements.nextToResolution);
        
        showSuccess('GeoJSON area loaded successfully');
      } catch (error) {
        console.error('❌ Invalid GeoJSON file:', error);
        showError('Invalid GeoJSON file');
      }
    };
    reader.readAsText(file);
  }
}

function addGeoJSONToMap(geojson) {
  // Clear existing GeoJSON layers
  clearGeoJSONLayers();
  
  // Add new GeoJSON layer
  const geojsonLayer = L.geoJSON(geojson, {
    style: {
      color: '#4facfe',
      weight: 2,
      fillColor: '#4facfe',
      fillOpacity: 0.2
    }
  }).addTo(app.maps.area);
  
  // Store reference to remove later
  app.geojsonLayer = geojsonLayer;
  
  // Fit map to GeoJSON bounds
  app.maps.area.fitBounds(geojsonLayer.getBounds());
  
  console.log('🗺️ GeoJSON added to map');
}

function clearAreaSelection() {
  // Clear drawn items
  if (app.drawnItems) {
    app.drawnItems.clearLayers();
  }
  
  // Clear GeoJSON layers
  clearGeoJSONLayers();
  
  // Reset spatial filter
  app.spatialFilter = null;
  
  // Reset UI
  hideBoundingBoxInfo();
  updateAreaControls('none');
  disableNextButton(elements.nextToResolution);
}

function clearGeoJSONLayers() {
  if (app.geojsonLayer) {
    app.maps.area.removeLayer(app.geojsonLayer);
    app.geojsonLayer = null;
  }
}

function showBoundingBoxInfo(coords) {
  const drawAreaGroup = document.querySelector('.control-group');
  let bboxInfo = drawAreaGroup.querySelector('.bbox-info');
  
  if (!bboxInfo) {
    bboxInfo = document.createElement('div');
    bboxInfo.className = 'bbox-info';
  }
  
  bboxInfo.innerHTML = `
    <div style="font-weight: 500; margin-bottom: 8px;">📍 Bounding Box Coordinates:</div>
    <div>North: ${coords.north}°</div>
    <div>South: ${coords.south}°</div>
    <div>East: ${coords.east}°</div>
    <div>West: ${coords.west}°</div>
  `;
  
  // Replace the original control-info with bbox-info
  const originalInfo = drawAreaGroup.querySelector('.control-info');
  if (originalInfo) {
    originalInfo.style.display = 'none';
  }
  
  if (!drawAreaGroup.contains(bboxInfo)) {
    drawAreaGroup.appendChild(bboxInfo);
  }
}

function hideBoundingBoxInfo() {
  const drawAreaGroup = document.querySelector('.control-group');
  const bboxInfo = drawAreaGroup.querySelector('.bbox-info');
  const originalInfo = drawAreaGroup.querySelector('.control-info');
  
  if (bboxInfo) {
    bboxInfo.remove();
  }
  
  if (originalInfo) {
    originalInfo.style.display = 'block';
  }
}

function updateAreaControls(status, filename = null) {
  const uploadButton = document.getElementById('upload-geojson');
  
  // Reset upload button to default state
  uploadButton.textContent = '📁 Upload GeoJSON';
  uploadButton.style.background = 'rgba(255, 255, 255, 0.2)';
  uploadButton.style.opacity = '1';
  
  // Update based on status
  switch (status) {
    case 'drawn':
      // Don't change upload button for drawn rectangles
      break;
    case 'geojson':
      uploadButton.textContent = `📁 ${filename}`;
      uploadButton.style.background = 'rgba(79, 172, 254, 0.2)';
      break;
    case 'none':
    default:
      // Already reset above
      break;
  }
}

// Initialize map when entering area step
function initializeAreaStep() {
  console.log('🗺️ Entering area selection step');
  initializeMap();
  
  // No need to disable country button since it's now just info
}

// Resolution and Processing
function handleResolutionChange() {
  const value = parseInt(elements.resolution.value);
  app.resolution = value;
  updateResolutionDisplay();
  
  // Process data if we have CSV and spatial filter
  if (app.csvData && app.spatialFilter) {
    processData();
  }
}

function handleBinChange() {
  app.binStep = parseInt(elements.binStep.value);
  app.binCount = parseInt(elements.binCount.value);
  
  // Update bin preview
  updateBinPreview();
  
  // Reprocess data if available to update hexagon colors and properties
  if (app.processedData) {
    console.log('🔄 Re-processing data with new bin settings...');
    processData();
  }
}

function updateResolutionDisplay() {
  const value = parseInt(elements.resolution.value);
  const area = h3Areas[value];
  
  elements.resValue.textContent = value;
  
  if (area >= 1) {
    elements.resArea.textContent = `(${area.toLocaleString(undefined, {maximumFractionDigits: 3})} km²)`;
  } else {
    elements.resArea.textContent = `(${(area * 1e6).toLocaleString(undefined, {maximumFractionDigits: 0})} m²)`;
  }
}

function processData() {
  if (!app.csvData || !app.spatialFilter) {
    console.log('❌ Cannot process data - missing CSV or spatial filter');
    console.log('📊 CSV data:', app.csvData ? `${app.csvData.length} rows` : 'null');
    console.log('🗺️ Spatial filter:', app.spatialFilter ? 'present' : 'null');
    return;
  }
  
  console.log('🔄 Starting data processing...');
  console.log('📊 Input data:', {
    csvRows: app.csvData.length,
    resolution: app.resolution,
    binStep: app.binStep,
    binCount: app.binCount,
    spatialFilterType: app.spatialFilter.getBounds ? 'Leaflet Bounds' : 'GeoJSON'
  });
  
  // Show loading state
  showLoading('Processing data...');
  
  // Process data asynchronously to avoid blocking UI
  setTimeout(() => {
    try {
      const result = performH3Processing();
      console.log('✅ Processing completed!');
      console.log('📊 Processed data summary:', {
        hexagonCount: result.features.length,
        totalPoints: app.csvData.length,
        filteredPoints: result.filteredPointsCount,
        resolution: app.resolution,
        sampleFeature: result.features[0],
        allFeatures: result.features
      });
      
      app.processedData = result;
      hideLoading();
      updateVisualization();
      updateDownloadInfo();
      updateBinPreview();
      enableNextButton(elements.nextToDownload);
      
      // Update the download button to be more dramatic
      if (elements.nextToDownload) {
        elements.nextToDownload.textContent = '🚀 Generate Your Download Files!';
        elements.nextToDownload.classList.add('download-ready');
      }
      
    } catch (error) {
      console.error('❌ Processing error:', error);
      hideLoading();
      showError('Error processing data: ' + error.message);
    }
  }, 100);
}

function performH3Processing() {
  console.log('🔍 Step 1: Spatial filtering...');
  
  // Step 1: Filter points based on spatial filter
  let filteredData = filterPointsBySpatialFilter(app.csvData, app.spatialFilter);
  console.log(`📍 Spatial filtering: ${app.csvData.length} → ${filteredData.length} points`);
  
  if (filteredData.length === 0) {
    throw new Error('No points found within the selected area');
  }
  
  console.log('🔷 Step 2: Assigning points to H3 hexagons...');
  
  // Step 2: Assign points to H3 hexagons
  const hexMap = assignPointsToHexagons(filteredData, app.resolution);
  console.log(`🔷 Hexagon assignment: ${Object.keys(hexMap).length} unique hexagons`);
  
  console.log('📊 Step 3: Creating GeoJSON features...');
  
  // Step 3: Create GeoJSON features with binning
  const { binEdges, binLabels } = getUserBins();
  const features = createHexagonFeatures(hexMap, binEdges, binLabels);
  console.log(`📊 Feature creation: ${features.length} hexagon features`);
  
  // Check hexagon count limit
  if (features.length > MAX_HEXAGONS) {
    console.warn(`⚠️ Warning: ${features.length} hexagons exceeds limit of ${MAX_HEXAGONS}`);
    showInfo(`Warning: ${features.length} hexagons generated. Consider using a lower resolution.`);
  }
  
  return {
    features: features,
    hexagonCount: features.length,
    totalPoints: app.csvData.length,
    filteredPointsCount: filteredData.length,
    resolution: app.resolution,
    binStep: app.binStep,
    binCount: app.binCount,
    binEdges: binEdges,
    binLabels: binLabels
  };
}

function filterPointsBySpatialFilter(data, spatialFilter) {
  console.log('🔍 Spatial filter type:', spatialFilter._southWest && spatialFilter._northEast ? 'Leaflet Bounds' : 'GeoJSON');
  console.log('🔍 Spatial filter details:', spatialFilter);
  
  // Check if it's a Leaflet bounds object (has _southWest and _northEast)
  if (spatialFilter._southWest && spatialFilter._northEast) {
    // Leaflet bounds filtering (fast bounding box)
    console.log('📍 Using Leaflet bounds filtering');
    console.log('📍 Bounding box:', {
      north: spatialFilter._northEast.lat,
      south: spatialFilter._southWest.lat,
      east: spatialFilter._northEast.lng,
      west: spatialFilter._southWest.lng
    });
    
    const filtered = data.filter(point => {
      const lat = +point.latitude;
      const lon = +point.longitude;
      return lat >= spatialFilter._southWest.lat && lat <= spatialFilter._northEast.lat &&
             lon >= spatialFilter._southWest.lng && lon <= spatialFilter._northEast.lng;
    });
    
    console.log(`📍 Bounding box filtering result: ${data.length} → ${filtered.length} points`);
    return filtered;
  } else {
    // GeoJSON polygon filtering (hybrid: bbox pre-filter + pointsWithinPolygon)
    console.log('🗺️ Using hybrid GeoJSON spatial filtering');
    console.log('🗺️ GeoJSON structure:', {
      type: spatialFilter.type,
      features: spatialFilter.features ? spatialFilter.features.length : 'N/A'
    });
    
    // Stage 1: Fast bounding box filtering
    const bounds = getGeoJSONBounds(spatialFilter);
    console.log('🗺️ Bounding box:', bounds);
    
    const bboxFiltered = data.filter(point => {
      const lat = parseFloat(point.latitude);
      const lon = parseFloat(point.longitude);
      return lat >= bounds.south && lat <= bounds.north &&
             lon >= bounds.west && lon <= bounds.east;
    });
    
    console.log(`🗺️ Stage 1 - Bounding box filter: ${data.length} → ${bboxFiltered.length} points`);
    
    // Stage 2: Bulk spatial filtering with pointsWithinPolygon
    const pointFeatures = bboxFiltered.map(point => 
      turf.point([parseFloat(point.longitude), parseFloat(point.latitude)])
    );
    const pointsFeatureCollection = turf.featureCollection(pointFeatures);
    
    const pointsWithin = turf.pointsWithinPolygon(pointsFeatureCollection, spatialFilter);
    console.log(`🗺️ Stage 2 - pointsWithinPolygon: ${bboxFiltered.length} → ${pointsWithin.features.length} points`);
    
    // Map back to original data (now much smaller set)
    const filteredCoordinates = pointsWithin.features.map(feature => feature.geometry.coordinates);
    const filtered = bboxFiltered.filter(point => {
      const pointCoords = [parseFloat(point.longitude), parseFloat(point.latitude)];
      return filteredCoordinates.some(coord => 
        coord[0] === pointCoords[0] && coord[1] === pointCoords[1]
      );
    });
    
    console.log(`🗺️ Total filtering result: ${data.length} → ${filtered.length} points`);
    return filtered;
  }
}

// Helper function to get bounding box of GeoJSON
function getGeoJSONBounds(geojson) {
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  
  function processCoordinates(coords) {
    if (Array.isArray(coords[0])) {
      coords.forEach(processCoordinates);
    } else {
      const [lon, lat] = coords;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
    }
  }
  
  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(feature => {
      if (feature.geometry) {
        processCoordinates(feature.geometry.coordinates);
      }
    });
  } else if (geojson.type === 'Feature') {
    if (geojson.geometry) {
      processCoordinates(geojson.geometry.coordinates);
    }
  } else if (geojson.type === 'Geometry') {
    processCoordinates(geojson.coordinates);
  }
  
  return { north: maxLat, south: minLat, east: maxLon, west: minLon };
}

function assignPointsToHexagons(data, resolution) {
  const hexMap = new Map();
  
  data.forEach(point => {
    const lat = parseFloat(point.latitude);
    const lon = parseFloat(point.longitude);
    
    // Skip invalid coordinates
    if (isNaN(lat) || isNaN(lon)) return;
    
    // Get H3 index for this point
    const h3Index = h3.latLngToCell(lat, lon, resolution);
    
    // Add point to hexagon
    if (!hexMap.has(h3Index)) {
      hexMap.set(h3Index, []);
    }
    hexMap.get(h3Index).push(point);
  });
  
  return hexMap;
}

function createHexagonFeatures(hexMap, binEdges, binLabels) {
  const features = [];
  
  hexMap.forEach((points, h3Index) => {
    const count = points.length;
    const bin = getBinLabel(count, binEdges, binLabels);
    
    // Get hexagon boundary coordinates
    const boundary = h3.cellToBoundary(h3Index, true);
    
    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [boundary]
      },
      properties: {
        h3index: h3Index,
        count: count,
        bin: bin
      }
    });
  });
  
  return features;
}

function updateVisualization() {
  // Initialize preview map if needed
  if (!app.maps.preview) {
    app.maps.preview = L.map('preview-map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(app.maps.preview);
  }
  
  // Clear existing hexagon layers
  if (app.hexagonLayer) {
    app.maps.preview.removeLayer(app.hexagonLayer);
  }
  
  // Add hexagon polygons to map if we have processed data
  if (app.processedData && app.processedData.features.length > 0) {
    console.log('🗺️ Adding hexagon polygons to map...');
    
    // Get color scale for binning
    const binsArr = app.processedData.binLabels;
    const colorScale = getBinColorScale(binsArr);
    
    // Create GeoJSON layer with custom styling
    app.hexagonLayer = L.geoJSON(app.processedData.features, {
      style: function(feature) {
        const bin = feature.properties.bin;
        const count = feature.properties.count;
        // Use custom color if set, otherwise default
        const color = app.customColors[bin] || getBinColor(bin, binsArr);
        return {
          fillColor: color,
          weight: 1,
          opacity: 0.8,
          color: '#333',
          fillOpacity: 0.6
        };
      },
      onEachFeature: function(feature, layer) {
        const count = feature.properties.count;
        const bin = feature.properties.bin;
        const h3index = feature.properties.h3index;
        
        layer.bindPopup(`
          <strong>Hexagon ${h3index}</strong><br>
          Points: ${count}<br>
          Bin: ${bin}
        `);
      }
    }).addTo(app.maps.preview);
    
    // Fit map to hexagon bounds
    app.maps.preview.fitBounds(app.hexagonLayer.getBounds());
    
    console.log(`🗺️ Added ${app.processedData.features.length} hexagon polygons to map`);
  }
  
  // Update histogram
  updateHistogram();
}

function updateHistogram() {
  const container = document.getElementById('histogram-container');
  if (!container) return;
  
  // Clear container
  container.innerHTML = '';
  
  // Check if we have processed data
  if (!app.processedData || !app.processedData.features || app.processedData.features.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500">Histogram will appear here after processing data</p>';
    return;
  }
  
  console.log('📊 Rendering dual histogram...');
  
  // Add instructions directly to container
  const instructions = document.createElement('p');
  instructions.className = 'histogram-instructions';
  instructions.innerHTML = `
    The <span class="histogram-orange">yellow chart</span> shows how many hexagons have an exact point count. 
    The <span class="histogram-green">green bars</span> show how many hexagons fall in each category bin. 
    Try to make them match as best as you can by adjusting the bin size and step.
  `;
  container.appendChild(instructions);
  
  // Extract counts from hexagon features
  const counts = app.processedData.features.map(f => f.properties.count);
  const binLabels = app.processedData.binLabels;
  const binEdges = app.processedData.binEdges;
  
  // Set up dimensions
  const width = 600;
  const height = 280;
  const margin = { top: 40, right: 120, bottom: 50, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // Create SVG
  const svg = d3.create('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'histogram-svg');
  
  // Create chart group
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  // X scale (point counts)
  const x = d3.scaleLinear()
    .domain([0, d3.max(counts)])
    .range([0, chartWidth]);
  
  // Raw histogram: points per hexagon (frequency of each count)
  const rawBins = d3.histogram()
    .domain(x.domain())
    .thresholds(x.ticks(30))(counts);
  
  // User-defined histogram: hexagons per user bin (frequency of counts in each bin interval)
  const userBins = [];
  for (let i = 0; i < binLabels.length; i++) {
    let x0, x1;
    const label = binLabels[i];
    
    if (label.endsWith('+')) {
      const match = label.match(/(\d+)(?=\+)/);
      x0 = match ? parseInt(match[1], 10) : 0;
      x1 = d3.max(counts) + 1; // include all counts >= x0
    } else {
      const [start, end] = label.split('–').map(Number);
      x0 = start;
      x1 = end;
    }
    
    const binCount = counts.filter(c => c >= x0 && c < x1).length;
    userBins.push({
      x0,
      x1,
      count: binCount,
      label
    });
  }
  
  // Y scale (shared for both area and bars)
  const y = d3.scaleLinear()
    .domain([0, d3.max([
      d3.max(rawBins, d => d.length),
      d3.max(userBins, d => d.count)
    ])])
    .nice()
    .range([chartHeight, 0]);
  
  // Yellow area chart (points per hexagon)
  const area = d3.area()
    .x(d => x((d.x0 + d.x1) / 2))
    .y0(y(0))
    .y1(d => y(d.length))
    .curve(d3.curveMonotoneX);
  
  g.append('path')
    .datum(rawBins)
    .attr('fill', '#fde725')
    .attr('opacity', 0.35)
    .attr('stroke', 'none')
    .attr('d', area);
  
  // Yellow line on top of area
  const line = d3.line()
    .x(d => x((d.x0 + d.x1) / 2))
    .y(d => y(d.length))
    .curve(d3.curveMonotoneX);
  
  g.append('path')
    .datum(rawBins)
    .attr('fill', 'none')
    .attr('stroke', '#fde725')
    .attr('stroke-width', 2)
    .attr('d', line)
    .raise(); // Move line to front, above the bars
  
  // Green bars (bin count)
  g.selectAll('rect.user-bar')
    .data(userBins)
    .enter().append('rect')
    .attr('class', 'user-bar')
    .attr('x', d => x(d.x0) + 1)
    .attr('y', d => y(d.count))
    .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr('height', d => y(0) - y(d.count))
    .attr('fill', '#35b779')
    .attr('opacity', 0.45)
    .on('mouseover', function(event, d) {
      let msg = `There are ${d.count} hexagons in the ${d.label} bin.`;
      if (d.label.endsWith('+')) {
        const inBin = counts.filter(c => c >= d.x0);
        if (inBin.length > 0) {
          const min = Math.min(...inBin);
          const max = Math.max(...inBin);
          msg += `<br>Actual counts range from ${min} to ${max}.`;
        }
      }
      showTooltip(event, msg);
    })
    .on('mouseout', function() {
      hideTooltip();
    });
  
  // X axis
  g.append('g')
    .attr('transform', `translate(0,${chartHeight})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format('d')))
    .call(g => g.selectAll('.tick text').attr('class', 'histogram-label'))
    .call(g => g.selectAll('.domain, .tick line').attr('class', 'histogram-axis-line'))
    .append('text')
    .attr('x', chartWidth / 2)
    .attr('y', 35)
    .attr('text-anchor', 'middle')
    .attr('class', 'histogram-label')
    .text('Number of points inside the hexagon');
  
  // Y axis
  g.append('g')
    .call(d3.axisLeft(y).ticks(6))
    .call(g => g.selectAll('.tick text').attr('class', 'histogram-label'))
    .call(g => g.selectAll('.domain, .tick line').attr('class', 'histogram-axis-line'))
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -40)
    .attr('x', -chartHeight / 2)
    .attr('text-anchor', 'middle')
    .attr('class', 'histogram-label')
    .text('Number of hexagons');
  
  // Legend
  const legend = svg.append('g')
    .attr('transform', `translate(${width - margin.right - 120}, ${margin.top + 10})`);
  
  // Yellow area legend
  legend.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', 22)
    .attr('height', 10)
    .attr('fill', '#fde725')
    .attr('opacity', 0.35);
  
  legend.append('line')
    .attr('x1', 0)
    .attr('y1', 5)
    .attr('x2', 22)
    .attr('y2', 5)
    .attr('stroke', '#fde725')
    .attr('stroke-width', 2);
  
  legend.append('text')
    .attr('x', 30)
    .attr('y', 10)
    .attr('text-anchor', 'start')
    .attr('font-size', '13px')
    .attr('class', 'histogram-label')
    .text('Raw point count distribution');
  
  // Green bars legend
  legend.append('rect')
    .attr('x', 0)
    .attr('y', 20)
    .attr('width', 22)
    .attr('height', 10)
    .attr('fill', '#35b779')
    .attr('opacity', 0.45);
  
  legend.append('text')
    .attr('x', 30)
    .attr('y', 30)
    .attr('text-anchor', 'start')
    .attr('font-size', '13px')
    .attr('class', 'histogram-label')
    .text('User-defined bins');
  
  // Add SVG directly to container
  container.appendChild(svg.node());
  
  console.log(`📊 Dual histogram rendered with ${rawBins.length} raw bins and ${userBins.length} user bins`);
}

// Simple tooltip functions
function showTooltip(event, text) {
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('background', 'rgba(0,0,0,0.8)')
    .style('color', 'white')
    .style('padding', '8px')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', '1000');
  
  tooltip.html(text)
    .style('left', (event.pageX + 10) + 'px')
    .style('top', (event.pageY - 10) + 'px');
}

function hideTooltip() {
  d3.selectAll('.tooltip').remove();
}

// Download Functions
function downloadSingleFile() {
  if (!app.processedData) {
    showError('No data to download. Please process your data first.');
    return;
  }
  
  console.log('📥 Starting single file download...');
  
  // Create enhanced GeoJSON with metadata
  const geojson = {
    type: 'FeatureCollection',
    features: app.processedData.features,
    properties: {
      metadata: {
        title: 'Hexagon Map Generated by Fire Hexbin Maker',
        description: 'H3 hexagon aggregation of point data',
        generated: new Date().toISOString(),
        parameters: {
          resolution: app.resolution,
          binStep: app.binStep,
          binCount: app.binCount,
          totalPoints: app.processedData.totalPoints,
          filteredPoints: app.processedData.filteredPointsCount,
          hexagonCount: app.processedData.hexagonCount
        },
        binLabels: app.processedData.binLabels,
        binEdges: app.processedData.binEdges
      }
    }
  };
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `hexbin_map_${timestamp}.geojson`;
  
  const blob = new Blob([JSON.stringify(geojson, null, 2)], {
    type: 'application/geo+json'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  
  console.log(`✅ Downloaded: ${filename}`);
  showSuccess(`Downloaded ${filename} (${app.processedData.hexagonCount} hexagons)`);
}

function downloadMultiFiles() {
  if (!app.processedData) {
    showError('No data to download. Please process your data first.');
    return;
  }
  
  console.log('📦 Starting multi-file ZIP download...');
  showInfo('Creating ZIP file with all bin layers...');
  
  // Group features by bin
  const featuresByBin = {};
  app.processedData.features.forEach(feature => {
    const bin = feature.properties.bin;
    if (!featuresByBin[bin]) {
      featuresByBin[bin] = [];
    }
    featuresByBin[bin].push(feature);
  });
  
  // Create ZIP file
  const zip = new JSZip();
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  
  // Add a file for each bin
  Object.entries(featuresByBin).forEach(([binLabel, features]) => {
    const geojson = {
      type: 'FeatureCollection',
      features: features,
      properties: {
        metadata: {
          title: `Hexagon Map - ${binLabel} Bin`,
          description: `H3 hexagons in the ${binLabel} category`,
          generated: new Date().toISOString(),
          parameters: {
            resolution: app.resolution,
            binStep: app.binStep,
            binCount: app.binCount,
            binLabel: binLabel,
            hexagonCount: features.length
          }
        }
      }
    };
    
    // Create safe filename
    const safeBinLabel = binLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `hexbin_${safeBinLabel}.geojson`;
    
    // Add to ZIP
    zip.file(filename, JSON.stringify(geojson, null, 2));
  });
  
  // Add a README file with metadata
  const readme = `Fire Hexbin Maker - Multi-Layer Export

Generated: ${new Date().toISOString()}
Total Hexagons: ${app.processedData.hexagonCount}
Resolution: ${app.resolution}
Bin Step: ${app.binStep}
Bin Count: ${app.binCount}

Files in this ZIP:
${Object.keys(featuresByBin).map(bin => `- ${bin}: ${featuresByBin[bin].length} hexagons`).join('\n')}

Each file contains GeoJSON features for hexagons in that specific bin category.
Use these files in GIS applications like QGIS, ArcGIS, or web mapping tools.
`;
  
  zip.file('README.txt', readme);
  
  // Generate and download ZIP
  zip.generateAsync({type: 'blob'}).then(function(content) {
    const filename = `hexbin_layers_${timestamp}.zip`;
    
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log(`📦 Downloaded: ${filename} with ${Object.keys(featuresByBin).length} layers`);
    showSuccess(`Downloaded ${filename} with ${Object.keys(featuresByBin).length} bin layers`);
  }).catch(function(error) {
    console.error('❌ ZIP creation error:', error);
    showError('Failed to create ZIP file: ' + error.message);
  });
}

// Utility Functions
function updateUploadSuccess(filename, rowCount) {
  const uploadArea = elements.uploadArea;
  if (uploadArea) {
    uploadArea.innerHTML = `
      <div class="upload-icon">✅</div>
      <h3>File uploaded successfully!</h3>
      <p>${filename} (${rowCount.toLocaleString()} rows)</p>
    `;
  }
}

function enableNextButton(button) {
  if (button) {
    button.disabled = false;
    button.style.opacity = '1';
    button.style.pointerEvents = 'auto';
  }
}

function disableNextButton(button) {
  if (button) {
    button.disabled = true;
    button.style.opacity = '0.5';
    button.style.pointerEvents = 'none';
  }
}

function showError(message) {
  console.error('❌ Error:', message);
  
  // Create toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef4444;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showSuccess(message) {
  console.log('✅ Success:', message);
  
  // Create toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showInfo(message) {
  console.log('ℹ️ Info:', message);
  
  // Create toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #3b82f6;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showLoading(message) {
  // Simple loading display - can be enhanced
  console.log('Loading: ' + message);
}

function hideLoading() {
  // Hide loading state
  console.log('Loading complete');
}

function restartApp() {
  // Clear all caches and form data
  clearFormCache();
  
  // Clear browser cache for this page
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }
  
  // Clear session storage
  sessionStorage.clear();
  
  // Clear local storage (if any)
  localStorage.clear();
  
  // Force reload with cache bypass
  console.log('🔄 Restarting application with complete cache clear...');
  window.location.reload(true); // true forces a reload from server, bypassing cache
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Initialize resolution step
function initializeResolutionStep() {
  console.log('⚙️ Initializing resolution step...');
  
  // Initialize preview map if needed
  if (!app.maps.preview) {
    console.log('🗺️ Initializing preview map...');
    app.maps.preview = L.map('preview-map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(app.maps.preview);
    console.log('✅ Preview map initialized');
  }
  
  // Update resolution display
  updateResolutionDisplay();
  
  // Update bin preview
  updateBinPreview();
  
  console.log('✅ Resolution step initialized');
}

// Bin computation and preview
function getUserBins() {
  const step = parseInt(elements.binStep.value) || 10;
  const count = parseInt(elements.binCount.value) || 10;
  
  const binEdges = [];
  const binLabels = [];
  
  for (let i = 0; i < count; i++) {
    const lower = i * step;
    const upper = (i + 1) * step;
    
    if (i === 0) {
      binEdges.push(lower); // lower is 0 for first bin
    }
    binEdges.push(upper);
    
    if (i === count - 1) {
      // Last bin is open-ended
      binLabels.push(`${lower + 1}+`); // Show 1+ for last bin
      binEdges[binEdges.length - 1] = Infinity;
    } else if (i === 0) {
      binLabels.push(`1–${upper}`); // First bin label is 1–N
    } else {
      binLabels.push(`${lower + 1}–${upper}`); // All other bins are as before
    }
  }
  
  return { binEdges, binLabels };
}

function getBinLabel(count, binEdges, binLabels) {
  // If count is in the last bin (the '+' bin), return the last label
  if (count >= binEdges[binEdges.length - 2]) {
    return binLabels[binLabels.length - 1];
  }
  
  for (let i = 0; i < binEdges.length - 1; i++) {
    if (count >= binEdges[i] && count < binEdges[i + 1]) {
      return binLabels[i];
    }
  }
  
  // fallback (should not be reached)
  return binLabels[binLabels.length - 1];
}

function updateBinPreview() {
  const { binEdges, binLabels } = getUserBins();

  // If no custom colors set, initialize with Purples palette
  if (Object.keys(app.customColors).length === 0) {
    const startColor = '#ffffff';
    const endColor = '#5e3c99';
    const n = binLabels.length;
    binLabels.forEach((label, i) => {
      const t = n === 1 ? 1 : i / (n - 1);
      app.customColors[label] = d3.interpolateLab(startColor, endColor)(t);
    });
  }

  // Legend swatches
  const previewString = binLabels.map((label, index) => {
    const color = app.customColors[label] || getBinColor(label, binLabels);
    return `<div class=\"legend-item\" data-bin-label=\"${label}\">\n              <div class=\"legend-value\">${label}</div>\n              <span class=\"bin-color-swatch\" style=\"background: ${color};\"></span>\n              <span class=\"palette-hex-label\">${rgbToHex(color)}</span>\n            </div>`;
  }).join('');

  // Update preview display
  const binPreview = document.getElementById('bin-preview');
  if (binPreview) {
    binPreview.innerHTML = previewString;
    // Remove the palette-hex-row if it exists
    const hexRow = document.getElementById('palette-hex-row');
    if (hexRow) {
      hexRow.remove();
    }
  }

  // Palette live update logic (no Apply button)
  const startInput = document.getElementById('palette-start-color');
  const endInput = document.getElementById('palette-end-color');
  // Add or update warning message
  let paletteWarning = document.getElementById('palette-warning');
  if (!paletteWarning) {
    paletteWarning = document.createElement('div');
    paletteWarning.id = 'palette-warning';
    paletteWarning.className = 'input-help';
    paletteWarning.style.color = '#ffb4b4';
    paletteWarning.style.marginTop = '6px';
    const paletteControls = document.getElementById('palette-controls');
    paletteControls.appendChild(paletteWarning);
  }
  function updatePaletteLive() {
    const startColor = startInput.value.trim();
    const endColor = endInput.value.trim();
    const hexRegex = /^#([0-9a-fA-F]{6})$/;
    if (!hexRegex.test(startColor) || !hexRegex.test(endColor)) {
      paletteWarning.textContent = 'Please enter valid hex codes for both colors (e.g. #ff0000)';
      return;
    }
    paletteWarning.textContent = '';
    const n = binLabels.length;
    binLabels.forEach((label, i) => {
      const t = n === 1 ? 1 : i / (n - 1);
      app.customColors[label] = d3.interpolateLab(startColor, endColor)(t);
    });
    updateBinPreview();
    updateVisualization();
  }
  if (startInput && endInput) {
    startInput.addEventListener('input', updatePaletteLive);
    endInput.addEventListener('input', updatePaletteLive);
  }

  // Show resulting hex codes below the legend, associating each with the correct color swatch
  let hexRow = document.getElementById('palette-hex-row');
  if (hexRow) {
    hexRow.innerHTML = binLabels.map(label => {
      const color = app.customColors[label] || getBinColor(label, binLabels);
      return `<span class=\"palette-hex-label\">${rgbToHex(color)}</span>`;
    }).join('');
  }

  // Replace the copy button with a discreet icon and tooltip
  let copyBtn = document.getElementById('copy-legend-html');
  if (!copyBtn) {
    copyBtn = document.createElement('button');
    copyBtn.id = 'copy-legend-html';
    copyBtn.className = 'copy-legend-btn';
    copyBtn.innerHTML = '<span style="font-size:18px;">📋</span>';
    copyBtn.title = 'Copy HTML';
    copyBtn.setAttribute('aria-label', 'Copy HTML');
    copyBtn.onmouseenter = () => { copyBtn.title = 'Copy HTML'; };
    copyBtn.onmouseleave = () => { copyBtn.title = 'Copy HTML'; };
    copyBtn.onclick = () => { copyLegendAsHTML(); copyBtn.title = 'Copied!'; setTimeout(() => { copyBtn.title = 'Copy HTML'; }, 1200); };
    // Place in legend container, top right
    const legendContainer = document.querySelector('.legend-container');
    if (legendContainer) {
      legendContainer.style.position = 'relative';
      copyBtn.style.position = 'absolute';
      copyBtn.style.right = '8px';
      copyBtn.style.top = '8px';
      copyBtn.style.background = 'none';
      copyBtn.style.border = 'none';
      copyBtn.style.cursor = 'pointer';
      copyBtn.style.padding = '2px 6px';
      legendContainer.appendChild(copyBtn);
    }
  }

  // Get min/max counts from processed data if available
  let minCount = 0;
  let maxCount = 0;
  if (app.processedData && app.processedData.features.length > 0) {
    const counts = app.processedData.features.map(f => f.properties.count);
    minCount = Math.min(...counts);
    maxCount = Math.max(...counts);
  }
  
  // Update info layer with min/max values
  const binPreviewCard = document.getElementById('bin-preview-card');
  const legendContainer = document.querySelector('.legend-container');
  
  if (legendContainer) {
    let infoLayer = legendContainer.querySelector('.legend-info-layer');
    if (!infoLayer) {
      infoLayer = document.createElement('div');
      infoLayer.className = 'legend-info-layer';
    }
    infoLayer.innerHTML = `<span class="min-count">Min. point count: ${minCount}</span><span class="max-count">Max. point count: ${maxCount}</span>`;
    
    // Insert info layer before the preview string
    if (binPreview && !legendContainer.contains(infoLayer)) {
      legendContainer.insertBefore(infoLayer, binPreview);
    }
    legendContainer.style.display = 'block';
  }
  
  if (binPreviewCard) {
    binPreviewCard.style.display = 'block';
  }
}

// Helper: Convert rgb/rgba color to hex
function rgbToHex(color) {
  // If already hex, return
  if (color.startsWith('#')) return color;
  // Parse rgb/rgba string
  const rgb = color.match(/\d+/g);
  if (!rgb) return '#000000';
  return (
    '#' +
    ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2]))
      .toString(16)
      .slice(1)
  );
}

function getBinColor(binLabel, binsArr) {
  const index = binsArr.indexOf(binLabel);
  if (index === -1) return '#cccccc';
  
  // Create a D3 color scale that can handle any number of bins
  const colorScale = d3.scaleSequential()
    .domain([0, binsArr.length - 1])
    .interpolator(d3.interpolateLab('#ffffff', '#5e3c99'));
  
  return colorScale(index);
}

function getBinColorScale(binsArr) {
  // Create a reusable color scale for the entire application
  return d3.scaleSequential()
    .domain([0, binsArr.length - 1])
    .interpolator(d3.interpolateLab('#ffffff', '#5e3c99'));
}

function updateDownloadInfo() {
  if (!app.processedData) return;
  
  console.log('📊 Calculating download file sizes...');
  
  // Calculate single file size
  const singleGeojson = {
    type: 'FeatureCollection',
    features: app.processedData.features,
    properties: {
      metadata: {
        title: 'Hexagon Map Generated by Fire Hexbin Maker',
        description: 'H3 hexagon aggregation of point data',
        generated: new Date().toISOString(),
        parameters: {
          resolution: app.resolution,
          binStep: app.binStep,
          binCount: app.binCount,
          totalPoints: app.processedData.totalPoints,
          filteredPoints: app.processedData.filteredPointsCount,
          hexagonCount: app.processedData.hexagonCount
        },
        binLabels: app.processedData.binLabels,
        binEdges: app.processedData.binEdges
      }
    }
  };
  
  const singleStr = JSON.stringify(singleGeojson, null, 2);
  const singleBlob = new Blob([singleStr], { type: 'application/geo+json' });
  const singleSize = singleBlob.size;
  
  // Calculate multi-file sizes (grouped by bin)
  const featuresByBin = {};
  app.processedData.features.forEach(feature => {
    const bin = feature.properties.bin;
    if (!featuresByBin[bin]) {
      featuresByBin[bin] = [];
    }
    featuresByBin[bin].push(feature);
  });
  
  let multiSize = 0;
  Object.entries(featuresByBin).forEach(([binLabel, features]) => {
    const geojson = {
      type: 'FeatureCollection',
      features: features,
      properties: {
        metadata: {
          title: `Hexagon Map - ${binLabel} Bin`,
          description: `H3 hexagons in the ${binLabel} category`,
          generated: new Date().toISOString(),
          parameters: {
            resolution: app.resolution,
            binStep: app.binStep,
            binCount: app.binCount,
            binLabel: binLabel,
            hexagonCount: features.length
          }
        }
      }
    };
    
    const str = JSON.stringify(geojson, null, 2);
    const blob = new Blob([str], { type: 'application/geo+json' });
    multiSize += blob.size;
    
    console.log(`Bin "${binLabel}": ${features.length} features, ${blob.size} bytes`);
  });
  
  // Add ZIP overhead (rough estimate)
  const zipOverhead = Object.keys(featuresByBin).length * 100; // ~100 bytes per file for ZIP headers
  const totalZipSize = multiSize + zipOverhead;
  
  console.log('Single GeoJSON size:', singleSize, 'bytes');
  console.log('Total multi size:', multiSize, 'bytes');
  console.log('Estimated ZIP size:', totalZipSize, 'bytes');
  
  // Format sizes
  const formatSize = size => {
    if (size > 1024 * 1024) {
      return (size / (1024 * 1024)).toFixed(2) + ' MB';
    } else {
      return (size / 1024).toFixed(1) + ' KB';
    }
  };
  
  // Check for warnings
  let warnings = [];
  if (singleSize > 2 * 1024 * 1024) {
    warnings.push('Single file is over 2MB - may be too large for some tools');
  }
  if (totalZipSize > 5 * 1024 * 1024) {
    warnings.push('ZIP file is over 5MB - download may take time');
  }
  if (app.processedData.hexagonCount > 10000) {
    warnings.push('Large number of hexagons - consider lower resolution');
  }
  
  // Update the file info display
  const fileInfo = document.getElementById('file-info');
  if (fileInfo) {
    const hexCount = document.getElementById('hex-count');
    const fileSize = document.getElementById('file-size');
    
    if (hexCount) hexCount.textContent = app.processedData.hexagonCount.toLocaleString();
    if (fileSize) fileSize.textContent = formatSize(singleSize);
    
    // Clear existing warnings and size info
    const existingWarnings = fileInfo.querySelector('.download-warnings');
    if (existingWarnings) existingWarnings.remove();
    
    const existingSizeInfo = fileInfo.querySelector('div[style*="margin-top: 10px"]');
    if (existingSizeInfo) existingSizeInfo.remove();
    
    // Add warnings if any
    if (warnings.length > 0) {
      const warningDiv = document.createElement('div');
      warningDiv.className = 'download-warnings';
      
      warningDiv.innerHTML = `
        <strong>⚠️ Warnings:</strong>
        ${warnings.map(w => `<br>• ${w}`).join('')}
      `;
      
      fileInfo.appendChild(warningDiv);
      
      // Update back button text to be more helpful when warnings exist
      if (elements.backToResolution) {
        elements.backToResolution.textContent = '← Adjust Settings';
        elements.backToResolution.style.background = 'rgba(239, 68, 68, 0.2)';
        elements.backToResolution.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        elements.backToResolution.style.color = 'rgba(255, 255, 255, 0.9)';
      }
    } else {
      // Reset back button to normal state
      if (elements.backToResolution) {
        elements.backToResolution.textContent = '← Go Back & Adjust';
        elements.backToResolution.style.background = 'rgba(255, 255, 255, 0.1)';
        elements.backToResolution.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        elements.backToResolution.style.color = 'rgba(255, 255, 255, 0.8)';
      }
    }
    
    // Add detailed size info
    const sizeInfo = document.createElement('div');
    sizeInfo.style.cssText = `
      margin-top: 10px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    `;
    sizeInfo.innerHTML = `
      <strong>Download sizes:</strong><br>
      Single file: ${formatSize(singleSize)}<br>
      Multi-file ZIP: ~${formatSize(totalZipSize)}
    `;
    
    fileInfo.appendChild(sizeInfo);
  }
  
  console.log('✅ Download info updated');
}

// Standalone validation function
function validateCurrentStep() {
  // Validate step 2 (upload) - CSV data required
  if (app.currentStep === 2) {
    if (app.csvData) {
      enableNextButton(elements.nextToArea);
    } else {
      disableNextButton(elements.nextToArea);
    }
  }
  
  // Validate step 3 (area) - spatial filter required
  if (app.currentStep === 3) {
    if (app.spatialFilter) {
      enableNextButton(elements.nextToResolution);
    } else {
      disableNextButton(elements.nextToResolution);
    }
  }
  
  // Validate step 4 (resolution) - processed data required
  if (app.currentStep === 4) {
    if (app.processedData) {
      enableNextButton(elements.nextToDownload);
    } else {
      disableNextButton(elements.nextToDownload);
    }
  }
}

// Helper: Inline all computed styles recursively
function inlineAllStyles(element) {
  const win = window;
  if (!element || !win) return;
  const computed = win.getComputedStyle(element);
  let styleString = '';
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    styleString += `${prop}:${computed.getPropertyValue(prop)};`;
  }
  element.setAttribute('style', styleString);
  // Recursively inline children
  for (const child of element.children) {
    inlineAllStyles(child);
  }
}

// Copy legend as HTML with inline CSS
function copyLegendAsHTML() {
  // Only copy the color swatches and their labels from #bin-preview
  const binPreview = document.getElementById('bin-preview');
  if (!binPreview) return;
  // Get all legend items (each contains a label and a swatch)
  const items = binPreview.querySelectorAll('.legend-item');
  if (!items.length) return;
  let html = '';
  items.forEach(item => {
    const swatch = item.querySelector('.bin-color-swatch');
    const label = item.querySelector('.legend-value');
    if (!swatch || !label) return;
    const color = window.getComputedStyle(swatch).backgroundColor;
    const labelText = label.textContent;
    html += `<span style=\"display:inline-block;text-align:center;margin:5px;\">\n      <span style=\"display:block;width:38px;height:18px;background-color:${color};border-radius:4px;margin:0 auto 5px auto;\"></span>\n      <span style=\"display:block;font-size:12px;margin-top:5px;color:#222;\">${labelText}</span>\n    </span>`;
  });
  navigator.clipboard.writeText(html).then(() => {
    const copyBtn = document.getElementById('copy-legend-html');
    if (copyBtn) {
      const originalTitle = copyBtn.title;
      copyBtn.title = 'Copied!';
      setTimeout(() => { copyBtn.title = originalTitle || 'Copy HTML'; }, 1200);
    }
  });
}

// Show feedback after copying
function showCopyFeedback() {
  const btn = document.getElementById('copy-legend-html');
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = 'Copied!';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 1200);
}

// Add live validation for bin-step and bin-count
function setupBinInputValidation() {
  const binStepInput = document.getElementById('bin-step');
  const binCountInput = document.getElementById('bin-count');
  // Add or update warning messages
  let binStepWarning = document.getElementById('bin-step-warning');
  if (!binStepWarning) {
    binStepWarning = document.createElement('div');
    binStepWarning.id = 'bin-step-warning';
    binStepWarning.className = 'input-help';
    binStepWarning.style.color = '#ffb4b4';
    binStepWarning.style.marginTop = '4px';
    binStepInput.parentElement.appendChild(binStepWarning);
  }
  let binCountWarning = document.getElementById('bin-count-warning');
  if (!binCountWarning) {
    binCountWarning = document.createElement('div');
    binCountWarning.id = 'bin-count-warning';
    binCountWarning.className = 'input-help';
    binCountWarning.style.color = '#ffb4b4';
    binCountWarning.style.marginTop = '4px';
    binCountInput.parentElement.appendChild(binCountWarning);
  }
  function validateBinInputs() {
    let valid = true;
    const stepVal = binStepInput.value.trim();
    const countVal = binCountInput.value.trim();
    if (!/^\d+$/.test(stepVal) || parseInt(stepVal) < 1) {
      binStepWarning.textContent = 'Please enter a positive integer.';
      valid = false;
    } else {
      binStepWarning.textContent = '';
    }
    if (!/^\d+$/.test(countVal) || parseInt(countVal) < 1) {
      binCountWarning.textContent = 'Please enter a positive integer.';
      valid = false;
    } else {
      binCountWarning.textContent = '';
    }
    if (valid) {
      updateBinPreview();
      updateVisualization();
    }
  }
  binStepInput.addEventListener('input', validateBinInputs);
  binCountInput.addEventListener('input', validateBinInputs);
} 