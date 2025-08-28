// Fire Hexbin Maker - Refactored Application
// Core state management and step navigation system

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

class AppState {
    constructor() {
        // Current step tracking
        this.currentStep = 1;
        this.totalSteps = 6;
        
        // Data storage
        this.rawCsv = null;
        this.originalCsvData = null;
        this.filteredCsvData = null;
        this.areaSelectedCsvData = null;
        this.processedData = null;
        
        // Filter state
        this.activeFilters = {};
        
        // Spatial filter state
        this.spatialFilter = null;

        // Configuration
        this.resolution = 2;
        this.binStep = 10;
        this.binCount = 10;

        // Colors
        
        // UI state
        this.maps = {};
        this.drawControl = null;
        this.drawnItems = null;
        this.hexagonLayer = null;
        this.geojsonLayer = null;
        this.customColors = {};

        // Constants
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.maxRows = 500000; // 500,000 rows
        this.previewRows = 50; // Preview limit for filter step


        // Centralized DOM elements
        this.elements = this.initializeElements();
    }


    initializeElements() {
        return {
            // Navigation buttons
            startButton: document.getElementById('start-button'),
            backToStart: document.getElementById('back-to-start'),
            backToUpload: document.getElementById('back-to-upload'),
            backToFilter: document.getElementById('back-to-filter'),
            backToArea: document.getElementById('back-to-area'),
            backToResolution: document.getElementById('back-to-resolution'),
            
            // Next buttons
            nextToFilter: document.getElementById('next-to-filter'),
            nextToArea: document.getElementById('next-to-area'),
            nextToResolution: document.getElementById('next-to-resolution'),
            nextToDownload: document.getElementById('next-to-download'),
            
            // Upload elements
            csvUpload: document.getElementById('csv-upload'),
            uploadArea: document.getElementById('upload-area'),
            sampleCsvSelect: document.getElementById('sample-csv-select'),

            // GeoJSON elements
            uploadGeojson: document.getElementById('upload-geojson'),
            geojsonUpload: document.getElementById('geojson-upload'),
            sampleGeojsonSelect: document.getElementById('sample-geojson-select'),
            
            // Progress elements
            progressFill: document.getElementById('progress-fill'),
            currentStepSpan: document.getElementById('current-step'),
            totalStepsSpan: document.getElementById('total-steps'),
            progressContainer: document.querySelector('.progress-container'),
            
            // Step containers
            stepStart: document.getElementById('step-start'),
            stepUpload: document.getElementById('step-upload'),
            stepFilter: document.getElementById('step-filter'),
            stepArea: document.getElementById('step-area'),
            stepResolution: document.getElementById('step-resolution'),
            stepDownload: document.getElementById('step-download')
        };
    }
    
    // Step management
    goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > this.totalSteps) {
            console.error(`Invalid step number: ${stepNumber}`);
            return false;
        }

        console.log(`🔄 Navigating from step ${this.currentStep} to step ${stepNumber}`);
        
        // Hide current step
        this.hideStep(this.currentStep);
        
        // Update current step
        this.currentStep = stepNumber;
        
        // Show new step
        this.showStep(stepNumber);
        
        // Update progress
        this.updateProgress();
        
        // Initialize step-specific functionality
        this.initializeStep(stepNumber);
        
        return true;
    }

    hideStep(stepNumber) {
        const stepElement = document.getElementById(`step-${this.getStepName(stepNumber)}`);
        if (stepElement) {
            stepElement.classList.remove('active');
        }
    }

    showStep(stepNumber) {
        const stepElement = document.getElementById(`step-${this.getStepName(stepNumber)}`);
        if (stepElement) {
            stepElement.classList.add('active');
        }
    }

    getStepName(stepNumber) {
        const stepNames = {
            1: 'start',
            2: 'upload',
            3: 'filter',
            4: 'area',
            5: 'resolution',
            6: 'download'
        };
        return stepNames[stepNumber];
    }

    updateProgress() {

        // If the current step is 1, hide the progress container
        if (this.currentStep === 1) {
            const progressContainer = document.querySelector('.progress-container');
            if (progressContainer) {
                progressContainer.classList.add('hidden');
            }
        } else {
            const progressContainer = document.querySelector('.progress-container');
            if (progressContainer) {
                progressContainer.classList.remove('hidden');
            }
        }

        const progress = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
        const progressFill = document.getElementById('progress-fill');
        const currentStepSpan = document.getElementById('current-step');
        const totalStepsSpan = document.getElementById('total-steps');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (currentStepSpan) {
            currentStepSpan.textContent = this.currentStep - 1;
        }
        
        if (totalStepsSpan) {
            totalStepsSpan.textContent = this.totalSteps - 1;
        }
        
        console.log(`📊 Progress: ${this.currentStep - 1}/${this.totalSteps - 1} (${progress.toFixed(1)}%)`);
    }

    initializeStep(stepNumber) {
        switch (stepNumber) {
            case 2:
                // Upload step - initialize file handling
                setTimeout(() => this.initializeUploadStep(), 100);
                break;
            case 3:
                // Filter step
                setTimeout(() => this.initializeFilterStep(), 100);
                break;
            case 4:
                // Area selection step
                setTimeout(() => this.initializeAreaStep(), 100);
                break;
            case 5:
                // Resolution step
                setTimeout(() => this.initializeResolutionStep(), 100);
                break;
            case 6:
                // Download step
                setTimeout(() => this.initializeDownloadStep(), 100);
                break;
        }
    }

    // Data validation methods
    canProceedToStep(stepNumber) {
        switch (stepNumber) {
            case 3: // Upload -> Filter
                return this.originalCsvData !== null;
            case 4: // Filter -> Area
                return this.hasValidData();
            case 5: // Area -> Resolution
                return this.spatialFilter !== null;
            case 6: // Resolution -> Download
                return this.processedData !== null;
            default:
                return true;
        }
    }

    hasValidData() {
        // User can proceed if they have either filtered data OR original data
        // This allows users to skip filtering if they want
        const data = this.filteredCsvData;
        return data && data.length > 0;
    }

    // Utility methods
    reset() {
        this.currentStep = 1;

        this.rawCsv = null;
        this.originalCsvData = null;
        this.filteredCsvData = null;
        this.areaSelectedCsvData = null;
        this.processedData = null;

        this.activeFilters = {};
        this.spatialFilter = null;

        this.resolution = 2;
        this.binStep = 10;
        this.binCount = 10;

        this.customColors = {};
        
        // Clear maps
        if (this.maps.area) {
            this.maps.area.remove();
            this.maps.area = null;
        }
        if (this.maps.preview) {
            this.maps.preview.remove();
            this.maps.preview = null;
        }
        
        // Reset upload UI
        this.resetUploadUI();
        
        // Update button states
        if (this.navigation) {
            this.navigation.updateButtonStates();
        }    
    
    }

    // ==================
    // UPLOAD STEP METHODS 
    // ==================

    initializeUploadStep() {
        console.log('📁 Initializing upload step...');
        
        // Set up file input listeners
        this.setupFileInputListeners();
        
        // Set up drag & drop functionality
        this.setupDragAndDrop();
        
        // Set up sample data loading
        this.setupSampleDataLoading();
        
        console.log('✅ Upload step initialized');
    }

    setupFileInputListeners() {
        const csvUpload = document.getElementById('csv-upload');
        const uploadArea = document.getElementById('upload-area');
        
        if (csvUpload && uploadArea) {
            // Handle file input change
            csvUpload.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    this.handleCSVFile(file);
                }
            });
            
            // Handle click on upload area
            uploadArea.addEventListener('click', () => {
                csvUpload.click();
            });
        }
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('upload-area');
        
        if (uploadArea) {
            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, (e) => e.preventDefault());
            });
            
            // Handle drag over (visual feedback)
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            // Handle drag leave
            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });
            
            // Handle file drop
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0 && files[0].type === 'text/csv') {
                    this.handleCSVFile(files[0]);
                } else {
                    this.showToast('Please drop a valid CSV file', 'error');
                }
            });
        }
    }

    setupSampleDataLoading() {
        const sampleSelect = document.getElementById('sample-csv-select');
        
        if (sampleSelect) {
            sampleSelect.addEventListener('change', async (event) => {
                const url = event.target.value;
                if (!url) return;
                
                try {
                    await this.loadSampleCSV(url);
                    sampleSelect.value = ''; // Reset selection
                } catch (error) {
                    this.showToast(`Failed to load sample: ${error.message}`, 'error');
                    sampleSelect.value = '';
                }
            });
        }
    }

    async handleCSVFile(file) {
        console.log('📁 Processing CSV file:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

        // Show loading toast
        const loadingToast = this.showToast('Processing CSV file...', 'loading');
        
        try {
            // Validate file size
            if (file.size > this.maxFileSize) {
                throw new Error(`File too large. Maximum size is ${(this.maxFileSize / 1024 / 1024).toFixed(0)}MB.`);
            }

             // Update loading message for file reading
             ToastManager.updateLoadingToast(loadingToast, 'Reading file...', 'loading');
            // Read file content
            const csvText = await this.readFileAsText(file);
            
            // Update loading message for parsing
            ToastManager.updateLoadingToast(loadingToast, 'Parsing CSV data...', 'loading');
            // Parse CSV data
            const parsedData = this.parseCSV(csvText);
            
            // Update loading message for validation
            ToastManager.updateLoadingToast(loadingToast, 'Validating data structure...', 'loading');
            // Validate CSV structure
            this.validateCSVStructure(parsedData);
            
            // Store data
            this.rawCsv = csvText;
            this.originalCsvData = parsedData;
            
            // Update UI
            this.updateUploadSuccess(file.name, parsedData.length);
            
            // Update button states
            if (this.navigation) {
                this.navigation.updateButtonStates();
            }
            
            console.log('✅ CSV file processed successfully');
            // Update loading toast to success
            ToastManager.updateLoadingToast(loadingToast, `CSV uploaded successfully: ${parsedData.length} rows`, 'success');            
        
        } catch (error) {
            console.error('❌ Error processing CSV:', error);
            // Update loading toast to error
            ToastManager.updateLoadingToast(loadingToast, `Error: ${error.message}`, 'error');
            this.resetUploadState();
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            
            reader.readAsText(file);
        });
    }

    parseCSV(csvText) {
        try {
            // Use D3's CSV parser
            const data = d3.csvParse(csvText);
            
            if (!data || data.length === 0) {
                throw new Error('CSV file is empty');
            }
            
            if (!data.columns || data.columns.length === 0) {
                throw new Error('CSV has no columns');
            }
            
            return data;
        } catch (error) {
            throw new Error(`Failed to parse CSV: ${error.message}`);
        }
    }


    validateCSVStructure(data) {
        // Check for required columns (case-insensitive)
        const columns = data.columns.map(col => col.trim().toLowerCase());
        const hasLat = columns.includes('latitude');
        const hasLon = columns.includes('longitude');
        
        if (!hasLat || !hasLon) {
            throw new Error('CSV must contain "latitude" and "longitude" columns – spelled exactly like this!');
        }
        
        // Check row count limit (max 500,000 rows)
        if (data.length > this.maxRows) {
            throw new Error(`Too many rows: ${data.length.toLocaleString()}. Maximum allowed is ${this.maxRows.toLocaleString()}.`);
        }
        
        // Validate all rows for coordinate format
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const lat = parseFloat(row.latitude);
            const lon = parseFloat(row.longitude);
            
            if (isNaN(lat) || isNaN(lon)) {
                throw new Error(`Invalid coordinates at row ${i + 1}`);
            }
            
            if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                throw new Error(`Coordinates out of range at row ${i + 1} (lat: ${lat}, lon: ${lon})`);
            }
        }

        // If we get here, validation passed
        console.log(`✅ CSV validation passed: ${data.length} rows, ${data.columns.length} columns`);
    
    }

    async loadSampleCSV(url) {
        console.log('�� Loading sample CSV from:', url);

         // Show loading toast
         const loadingToast = this.showToast('Loading sample data...', 'loading');
        
        
        try {            
            // Update loading message
            ToastManager.updateLoadingToast(loadingToast, 'Fetching sample file...', 'loading');

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Update loading message
            ToastManager.updateLoadingToast(loadingToast, 'Processing sample data...', 'loading');
            
            const csvText = await response.text();
            
            // Create a File object from the sample data
            const filename = url.split('/').pop();
            const file = new File([csvText], filename, { type: 'text/csv' });
            
            // Process the sample file
            await this.handleCSVFile(file);

            // Remove the loading toast (handleCSVFile will show its own result)
            ToastManager.removeLoadingToast(loadingToast);
            
        } catch (error) {
            console.error('❌ Failed to load sample CSV:', error);
            // Update loading toast to error
            ToastManager.updateLoadingToast(loadingToast, `Failed to load sample: ${error.message}`, 'error');            // Don't reset upload state here - just show the error
        }
    }

    updateUploadSuccess(filename, rowCount) {
        const uploadArea = document.getElementById('upload-area');
        
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="upload-icon">✅</div>
                <h3>File loaded successfully!</h3>
                <p>${filename}</p>
                <p class="file-info">${rowCount.toLocaleString()} rows loaded</p>
                <button class="change-file-btn" onclick="app.changeFile()">Change File</button>
            `;
        }
    }

    changeFile() {
        console.log('🔄 User requested file change...');
        this.resetUploadState();
    }

    resetUploadState() {
        console.log('🔄 Resetting upload state...');
        
        // Clear data
        this.rawCsv = null;
        this.csvData = null;
        this.originalCsvData = null;
        this.filteredCsvData = null;
        
        // Reset UI to upload area
        this.resetUploadUI();
        
        // Update button states
        if (this.navigation) {
            this.navigation.updateButtonStates();
        }
        
        console.log('✅ Upload state reset complete');
    }

    resetUploadUI() {
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="upload-icon">📁</div>
                <h3>Drop your CSV file here</h3>
                <p>or click to browse</p>
                <input type="file" id="csv-upload" accept=".csv" style="display: none;">
            `;
            
            // Re-setup listeners for the new upload area
            this.setupFileInputListeners();
            this.setupDragAndDrop();
        }
    }


    // ================================
    // FILTER AND PREVIEW STEP METHODS
    // ================================

    initializeFilterStep() {
        console.log('🔍 Initializing filter step...');
        
        // Initialize filteredCsvData with original data so user can proceed without filters
        if (!this.filteredCsvData) {
            this.filteredCsvData = this.originalCsvData;
        }
        
        // Create data preview
        this.createDataPreview();

        // Initialize active filters display
        this.updateActiveFiltersDisplay();
        
        // Update button states to ensure navigation is available
        if (this.navigation) {
            this.navigation.updateButtonStates();
        }
        
        console.log('✅ Filter step initialized');
    }

    createDataPreview() {
        const data = this.originalCsvData;
        if (!data || data.length === 0) {
            this.showToast('No data to preview', 'error');
            return;
        }


        // Get preview data (first 50 rows)
        const columns = data.columns;
        const previewData = data.slice(0, this.previewRows);
        
        // Create preview table
        this.createPreviewTable(previewData);
        
        // Show preview info
        this.updatePreviewInfo(data.length, previewData.length);
    }


    createPreviewTable(data) {

        data.columns = this.originalCsvData.columns;

        const previewContainer = document.getElementById('data-preview');
        if (!previewContainer) return;
        
        // Clear existing content
        previewContainer.innerHTML = '';
        
        if (data.length === 0) {
            previewContainer.innerHTML = '<p>No data to display</p>';
            return;
        }
        
        // Create table using D3
        const table = d3.select(previewContainer)
            .append('table')
            .attr('class', 'preview-table');
        
        // Create header
        const header = table.append('thead').append('tr');
        const headerCells = header.selectAll('th')
            .data(data.columns)
            .enter()
            .append('th');
        
        // Add column name
        headerCells.append('div')
            .attr('class', 'column-header')
            .text(d => d);


        // Add filter icon below each column name
        headerCells.append('div')
            .attr('class', 'filter-icon')
            .attr('data-column', d => d)
            .html('<span class=\'table-icon\'>Filter <i class="si-filter"></i></span>')
            .style('cursor', 'pointer')
            .on('click', (event, column) => {
                this.openFilterPopup(column, this.originalCsvData);
            });
        
        // Create body
        const tbody = table.append('tbody');
        const rows = tbody.selectAll('tr')
            .data(data)
            .enter()
            .append('tr');
        
        // Add cells
        rows.selectAll('td')
            .data(d => data.columns.map(col => d[col]))
            .enter()
            .append('td')
            .text(d => d || 'N/A');
    }

    updatePreviewInfo(totalRows, previewRows) {
        const previewInfo = document.getElementById('preview-info');
        if (previewInfo) {
            previewInfo.innerHTML = `
                <p>Showing first ${previewRows} of ${totalRows.toLocaleString()} rows</p>
            `;
        }
    }


    openFilterPopup(column, data) {
        console.log(` Opening filter popup for column: ${column}`);
        
        // Create or get the popup for this specific column
        let popup = document.getElementById(`filter-popup-${column}`);
        
        if (!popup) {
            // Create new popup for this column
            popup = this.createColumnFilterPopup(column);
            document.body.appendChild(popup);
        }
        
        // Update the popup content
        this.updateColumnFilterPopup(popup, column, data);
        
        // Show this specific popup
        popup.style.display = 'flex';
        
        // Hide all other popups
        this.hideOtherFilterPopups(column);
    }

    closeFilterPopup() {
        // Close all filter popups
        document.querySelectorAll('.filter-popup').forEach(popup => {
            popup.style.display = 'none';
        });
    }

    setupFilterPopupListeners(column, data) {
        // This method is no longer needed with the new column-specific popup system
        // Event listeners are now set up in setupColumnFilterPopupListeners
        console.log(`Event listeners for ${column} will be set up in setupColumnFilterPopupListeners`);
    }

    handleFilterTypeChange(column, newType, data) {
        console.log(`🔄 Changing filter type for ${column} to ${newType}`);
        
        const filterContent = document.getElementById('filter-content');
        if (filterContent) {
            filterContent.innerHTML = this.createFilterContent(column, data, newType);
            filterContent.dataset.column = column;
        }
    }
    
    handleApplyFilter(column) {
        console.log(`✅ Applying filter for column: ${column}`);
        console.log(`🔍 Active filters BEFORE:`, JSON.stringify(this.activeFilters, null, 2));

        
        // Collect filter values and apply them
        const filterData = this.collectFilterData(column);
        console.log(`🔍 Collected filter data:`, JSON.stringify(filterData, null, 2));

        if (filterData) {
            this.activeFilters[column] = filterData;
            console.log(`🔍 Active filters AFTER setting ${column}:`, JSON.stringify(this.activeFilters, null, 2));

            this.applyFilters();
            this.closeFilterPopup();
            this.showToast(`Filter applied to ${column}`, 'success');
        }
    }
    
    handleClearFilter(column) {
        console.log(`🗑️ Clearing filter for column: ${column}`);
        
        delete this.activeFilters[column];
        
        // If no more filters, reset to original data
        if (Object.keys(this.activeFilters).length === 0) {
            this.filteredCsvData = this.originalCsvData;
        }
        
        this.applyFilters();
        this.closeFilterPopup();
        this.showToast(`Filter cleared for ${column}`, 'success');
    }
    
    collectFilterData(column) {
        console.log("Collecting filter data for column:", column);
        
        // Get the popup for this specific column
        const popup = document.getElementById(`filter-popup-${column}`);
        if (!popup) {
            console.error(`No popup found for column: ${column}`);
            return null;
        }
        
        // Get filter type from this specific popup
        const typeSelector = popup.querySelector('.filter-type');
        const filterType = typeSelector ? typeSelector.value : 'categorical';
        
        console.log("Filter type:", filterType);
        
        switch (filterType) {
            case 'categorical':
                return this.collectCategoricalFilterData(column);
            case 'numeric':
                return this.collectNumericFilterData(column);
            case 'date':
                return this.collectDateFilterData(column);
            default:
                return null;
        }
    }
    
    collectCategoricalFilterData(column) {
        console.log(` === COLLECTING CATEGORICAL DATA FOR ${column} ===`);

        // Get the popup for this specific column
        const popup = document.getElementById(`filter-popup-${column}`);
        if (!popup) {
            console.error(`No popup found for column: ${column}`);
            return null;
        }
        
        // Only get checkboxes from this specific popup
        const uncheckedBoxes = popup.querySelectorAll(`.filter-content input[type="checkbox"]:not(:checked)`);
        console.log(`🔍 Found ${uncheckedBoxes.length} unchecked checkboxes`);

        uncheckedBoxes.forEach((cb, i) => {
            console.log(`🔍 Checkbox ${i}: value="${cb.value}", data-column="${cb.dataset.column}"`);
        });

        const excludedValues = Array.from(uncheckedBoxes).map(cb => cb.value);
        console.log("Excluded values:", excludedValues);
        if (excludedValues.length === 0) return null;
        
        const filterValues = {
            type: 'categorical',
            exclude: excludedValues
        }

        console.log("Filter values:", filterValues);

        return filterValues;
    }
    
    collectNumericFilterData(column) {
        // Get the popup for this specific column
        const popup = document.getElementById(`filter-popup-${column}`);
        if (!popup) {
            console.error(`No popup found for column: ${column}`);
            return null;
        }
        
        // Only get inputs from this specific popup
        const minInput = popup.querySelector('.min-input');
        const maxInput = popup.querySelector('.max-input');
        
        const min = minInput ? parseFloat(minInput.value) : undefined;
        const max = maxInput ? parseFloat(maxInput.value) : undefined;
        
        if (min === undefined && max === undefined) return null;
        
        return {
            type: 'numeric',
            min: min,
            max: max
        };
    }
    
    collectDateFilterData(column) {
        // Get the popup for this specific column
        const popup = document.getElementById(`filter-popup-${column}`);
        if (!popup) {
            console.error(`No popup found for column: ${column}`);
            return null;
        }
        
        // Only get inputs from this specific popup
        const dateFrom = popup.querySelector('.date-from');
        const dateTo = popup.querySelector('.date-to');
        
        const from = dateFrom ? dateFrom.value : undefined;
        const to = dateTo ? dateTo.value : undefined;
        
        if (!from && !to) return null;
        
        return {
            type: 'date',
            dateFrom: from,
            dateTo: to
        };
    }


    createFilterContent(column, data, type) {
        switch (type) {
            case 'categorical':
                return this.createCategoricalFilter(column, data);
            case 'numeric':
                return this.createNumericFilter(column, data);
            case 'date':
                return this.createDateFilter(column, data);
            default:
                return this.createCategoricalFilter(column, data);
        }
    }
    
    createCategoricalFilter(column, data) {
        // Get unique values
        const uniqueValues = [...new Set(data.map(row => row[column]).filter(val => val !== ''))];
        
        // Selects the first 100 unique values to display
        const displayValues = uniqueValues.slice(0, 100);
        const hasMore = uniqueValues.length > 100;

        
        let html = `
            <div class="categorical-filter">
                <div class="filter-summary">
                    ${hasMore ? `<span class="more-indicator">Showing first 100 for performance reasons – consider limiting the amount of categories or using a different filter type)</span>` : ''}
                    <span>${uniqueValues.length} unique values</span>
                </div>
                <div class="value-list">
        `;
        
        displayValues.forEach(value => {
            html += `
                <label class="filter-checkbox">
                    <input type="checkbox" value="${value}" data-column="${column}" checked>
                    <span>${value}</span>
                </label>
            `;
        });
        
        html += `
                </div>
                <div class="filter-actions">
                    <button class="select-all-btn" onclick="app.selectAllValues('${column}')">Select All</button>
                    <button class="clear-all-btn" onclick="app.clearAllValues('${column}')">Clear All</button>
                </div>
            </div>
        `;
        
        return html;
    }
    
    createNumericFilter(column, data) {
        const values = data.map(row => parseFloat(row[column])).filter(val => !isNaN(val));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        
        return `
            <div class="numeric-filter">
                <div class="filter-summary">
                    <span>Range: ${min.toFixed(2)} to ${max.toFixed(2)} | Avg: ${avg.toFixed(2)}</span>
                </div>
                <div class="range-inputs">
                    <label>
                        Min: <input type="number" class="min-input" data-column="${column}" value="${min.toFixed(2)}" step="0.01">
                    </label>
                    <label>
                        Max: <input type="number" class="max-input" data-column="${column}" value="${max.toFixed(2)}" step="0.01">
                    </label>
                </div>
            </div>
        `;
    }
    
    createDateFilter(column, data) {
        return `
            <div class="date-filter">
                <div class="date-format-selector">
                    <label>Date Format:</label>
                    <select class="date-format" data-column="${column}">
                        <option value="auto">Auto-detect</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    </select>
                </div>
                <div class="date-range">
                    <label>
                        From: <input type="date" class="date-from" data-column="${column}">
                    </label>
                    <label>
                        To: <input type="date" class="date-to" data-column="${column}">
                    </label>
                </div>
            </div>
        `;
    }
    
    applyFilters() {
        console.log('🔍 Applying filters...');

        console.log('🔍 Active filters:', this.activeFilters);
        
        if (Object.keys(this.activeFilters).length === 0) {
            // No filters, use original data
            this.filteredCsvData = this.originalCsvData;
            this.updateFilteredPreview(this.originalCsvData);
            this.updateActiveFiltersDisplay();
            return;
        }
        
        // Apply filters to data
        const filteredData = this.filterData(this.originalCsvData, this.activeFilters);
        
        // Update filtered data
        this.filteredCsvData = filteredData;
        
        // Update preview
        this.updateFilteredPreview(filteredData);
        this.updateActiveFiltersDisplay();
        
        // Update button states
        if (this.navigation) {
            this.navigation.updateButtonStates();
        }
        
        console.log(`✅ Filters applied: ${filteredData.length} rows remaining`);
        console.log("Filtered data:", filteredData);
        console.log("AppState filtered data:", this.filteredCsvData);
    }
    
    filterData(data, filters) {
        return data.filter(row => {
            return Object.keys(filters).every(column => {
                const filter = filters[column];
                const value = row[column];
                
                // Categorical filter
                if (filter.type === 'categorical' && filter.exclude && filter.exclude.length > 0) {
                    return !filter.exclude.includes(value);
                }
                
                // Numeric filter
                if (filter.type === 'numeric') {
                    const numValue = parseFloat(value);
                    if (isNaN(numValue)) return false;
                    if (filter.min !== undefined && numValue < filter.min) return false;
                    if (filter.max !== undefined && numValue > filter.max) return false;
                }
                
                // Date filter
                if (filter.type === 'date') {
                    const dateValue = new Date(value);
                    if (isNaN(dateValue.getTime())) return false;
                    if (filter.dateFrom && dateValue < new Date(filter.dateFrom)) return false;
                    if (filter.dateTo && dateValue > new Date(filter.dateTo)) return false;
                }
                
                return true;
            });
        });
    }
    
    updateFilteredPreview(filteredData) {
        const previewData = filteredData.slice(0, this.previewRows);
        this.createPreviewTable(previewData);
        this.updatePreviewInfo(filteredData.length, previewData.length);
    }
    
    selectAllValues(column) {
        const popup = document.getElementById(`filter-popup-${column}`);
        if (popup) {
            popup.querySelectorAll(`.filter-content input[type="checkbox"][data-column="${column}"]`).forEach(checkbox => {
                checkbox.checked = true;
            });
        }
    }
    
    clearAllValues(column) {
        const popup = document.getElementById(`filter-popup-${column}`);
        if (popup) {
            popup.querySelectorAll(`.filter-content input[type="checkbox"][data-column="${column}"]`).forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    }

    updateActiveFiltersDisplay() {
        const container = document.getElementById('active-filters-list');
        if (!container) return;
        
        const filterKeys = Object.keys(this.activeFilters);
        
        if (filterKeys.length === 0) {
            container.innerHTML = '<p class="no-filters-message">No filters applied</p>';
            return;
        }
        
        let html = '';
        filterKeys.forEach(column => {
            const filter = this.activeFilters[column];
            html += this.createFilterTag(column, filter);
        });
        
        container.innerHTML = html;
        
        // Add remove listeners
        this.setupFilterTagListeners();
    }
    
    createFilterTag(column, filter) {
        let filterText = '';
        
        switch (filter.type) {
            case 'categorical':
                filterText = `${filter.exclude.length} values excluded`;
                break;
            case 'numeric':
                if (filter.min !== undefined && filter.max !== undefined) {
                    filterText = `${filter.min} - ${filter.max}`;
                } else if (filter.min !== undefined) {
                    filterText = `≥ ${filter.min}`;
                } else if (filter.max !== undefined) {
                    filterText = `≤ ${filter.max}`;
                }
                break;
            case 'date':
                if (filter.dateFrom && filter.dateTo) {
                    filterText = `${filter.dateFrom} to ${filter.dateTo}`;
                } else if (filter.dateFrom) {
                    filterText = `≥ ${filter.dateFrom}`;
                } else if (filter.dateTo) {
                    filterText = `≤ ${filter.dateTo}`;
                }
                break;
        }
        
        return `
            <div class="filter-tag" data-column="${column}">
                <span><strong>${column}:</strong> ${filterText}</span>
                <button class="remove-filter" onclick="app.removeFilter('${column}')" title="Remove filter">×</button>
            </div>
        `;
    }
    
    setupFilterTagListeners() {
        // Remove filter listeners are handled by onclick in the HTML
        // This method can be used for any additional listeners if needed
    }
    
    removeFilter(column) {
        console.log(`🗑️ Removing filter for column: ${column}`);
        
        delete this.activeFilters[column];
        
        // If no more filters, reset to original data
        if (Object.keys(this.activeFilters).length === 0) {
            this.filteredCsvData = this.originalCsvData;
        }
        
        // Reapply filters
        this.applyFilters();
        
        // Update the display
        this.updateActiveFiltersDisplay();
        
        this.showToast(`Filter removed from ${column}`, 'info');
    }
    

    // Method to create a new filter popup for a specific column
    createColumnFilterPopup(column) {
        const popup = document.createElement('div');
        popup.id = `filter-popup-${column}`;
        popup.className = 'filter-popup';
        popup.style.display = 'none';
        
        popup.innerHTML = `
            <div class="filter-popup-header">
                <h4 class="filter-popup-title">Filter: ${column}</h4>
                <button class="close-filter-btn" onclick="app.closeColumnFilterPopup('${column}')">×</button>
            </div>
            
            <div class="filter-popup-content">
                <div class="filter-type-selector">
                    <label>Filter Type</label>
                    <select class="filter-type" data-column="${column}">
                        <option value="categorical">Categorical (Select Values)</option>
                        <option value="numeric">Numeric (Range)</option>
                        <option value="date">Date (Range)</option>
                    </select>
                </div>
                
                <div class="filter-content" data-column="${column}">
                    <!-- Filter content will be generated here -->
                </div>
                
                <div class="filter-popup-actions">
                    <button class="clear-filter-btn" data-column="${column}">Clear Filter</button>
                    <button class="apply-filter-btn" data-column="${column}">Apply Filter</button>
                </div>
            </div>
        `;
        
        // Setup event listeners for this specific popup
        this.setupColumnFilterPopupListeners(popup, column);
        
        return popup;
    }

    // Method to update the content of a specific column filter popup
    updateColumnFilterPopup(popup, column, data) {
        // Update title
        const title = popup.querySelector('.filter-popup-title');
        if (title) {
            title.textContent = `Filter: ${column}`;
        }
        
        // Update filter content with stored type (or default to 'categorical')
        const filterContent = popup.querySelector('.filter-content');
        if (filterContent) {
            const previousFilterType = popup.dataset.filterType || 'categorical';
            filterContent.innerHTML = this.createFilterContent(column, data, previousFilterType);
        }
    }

    // Method to hide all other filter popups except the one for the given column
    hideOtherFilterPopups(currentColumn) {
        // Hide all filter popups except the current one
        document.querySelectorAll('.filter-popup').forEach(popup => {
            if (popup.id !== `filter-popup-${currentColumn}`) {
                popup.style.display = 'none';
            }
        });
    }

    // Method to close a specific column's filter popup
    closeColumnFilterPopup(column) {
        const popup = document.getElementById(`filter-popup-${column}`);
        if (popup) {
            popup.style.display = 'none';
        }
    }

    // Method to setup event listeners for a specific column's filter popup
    setupColumnFilterPopupListeners(popup, column) {
        // Filter type change - only affects this popup
        const typeSelector = popup.querySelector('.filter-type');
        if (typeSelector) {
            typeSelector.addEventListener('change', (e) => {
                this.handleColumnFilterTypeChange(column, e.target.value);
            });
        }
        
        // Apply filter button - only affects this column
        const applyBtn = popup.querySelector('.apply-filter-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.handleApplyFilter(column);
            });
        }
        
        // Clear filter button - only affects this column
        const clearBtn = popup.querySelector('.clear-filter-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.handleClearFilter(column);
            });
        }
    }

    // Method to handle filter type change for a specific column
    handleColumnFilterTypeChange(column, newType) {
        console.log(`🔄 Changing filter type for ${column} to ${newType}`);
        
        const popup = document.getElementById(`filter-popup-${column}`);
        if (popup) {
            // Store the selected type in the popup's dataset for persistence
            popup.dataset.filterType = newType;
            
            const filterContent = popup.querySelector('.filter-content');
            if (filterContent) {
                filterContent.innerHTML = this.createFilterContent(column, this.originalCsvData, newType);
            }
        }
    }

    // ================================================
    // TOAST METHODS
    // ================================================

    // Toast method
    showToast(message, type = 'info') {
        return ToastManager.show(message, type);
    }

    // ================================================
    // AREA FILTERING METHODS
    // ================================================

    initializeAreaStep() {
        console.log('��️ Initializing area selection step...');
        
        // Initialize the basic map
        this.initializeBasicMap();
        
        // Setup rectangle drawing
        this.setupRectangleDrawing();
        
        // Setup GeoJSON upload functionality
        this.setupGeoJSONUpload();
        
        // Setup sample GeoJSON loading
        this.setupSampleGeoJSONLoading();
        
        console.log('✅ Area step initialized');
    }

    initializeBasicMap() {
        if (!this.maps.area) {
            console.log('🗺️ Creating area selection map...');
            
            // Create Leaflet map
            this.maps.area = L.map('map').setView([0, 0], 2);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(this.maps.area);
            console.log('Tile layer created:', L.tileLayer);
            
            // Initialize drawn items layer
            this.drawnItems = new L.FeatureGroup();
            this.maps.area.addLayer(this.drawnItems);
            
            console.log('✅ Basic map initialized');
        }
    }

    setupRectangleDrawing() {
        console.log('🔧 Setting up rectangle drawing...');

        // Create drawing control (rectangle only)
        const drawControl = new L.Control.Draw({
            draw: {
                rectangle: true,
                polygon: false,
                polyline: false,
                circle: false,
                marker: false,
                circlemarker: false
            },
            edit: false
        });

        console.log('Draw control created:', drawControl);
    
        // Check if map exists before adding control
        console.log('Map object:', this.maps.area);
        console.log('Map container:', this.maps.area?._container);
        
        this.maps.area.addControl(drawControl);
        console.log('Draw control added to map', drawControl);

        // Check if the control is actually in the DOM
        setTimeout(() => {
            const drawContainer = document.querySelector('.leaflet-draw');
            console.log('Draw container in DOM:', drawContainer);
            console.log('Draw container HTML:', drawContainer?.outerHTML);
        }, 100);

        
        // Handle drawing events
        this.maps.area.on('draw:created', (event) => {
            this.handleRectangleDrawn(event);
        });
        console.log('Drawing event listeners set up');

    }

    handleRectangleDrawn(event) {
        console.log('📐 Rectangle drawn');
        
        const layer = event.layer;
        
        // Clear any existing drawings
        this.drawnItems.clearLayers();
        
        // Add the new rectangle
        this.drawnItems.addLayer(layer);
        
        // Store the bounds as spatial filter
        this.spatialFilter = layer.getBounds();
        
        // Update filtered data
        this.applySpatialFilter();
        
        // Update UI
        this.updateAreaSelectionUI();
        
        // Enable next button
        if (this.navigation) {
            this.navigation.updateButtonStates();
        }
        
        this.showToast('Area selected successfully!', 'success');
    }

    applySpatialFilter() {
        if (!this.spatialFilter || !this.filteredCsvData) {
            return;
        }
        
        console.log('🔍 Applying spatial filter...');

        let filteredData;
        
        if (this.isLeafletBounds(this.spatialFilter)) {
            // Rectangle filtering (fast)
            filteredData = this.applyBoundingBoxFilter();
        } else {
            // GeoJSON filtering (hybrid approach)
            filteredData = this.applyGeoJSONFilter();
        }
        

        // Sanity check: if no points in selected area, warn and discard
        if (filteredData.length === 0) {
            this.showToast('⚠️ No data points found in selected area. Please choose a larger area.', 'warning');
            
            this.discardSpatialSelection()           
            
            return;
        }

        this.showToast('GeoJSON area loaded successfully', 'success');
        
        // Save to areaSelectedCsvData instead of filteredCsvData
        this.areaSelectedCsvData = filteredData;
        
        console.log(`🔍 Spatial filtering: ${this.originalCsvData.length} → ${filteredData.length} points`);

    }

    discardSpatialSelection() {
        console.log('🗑️ Discarding spatial selection due to zero points');
        
        // Clear the spatial filter
        this.spatialFilter = null;
        this.areaSelectedCsvData = null;
        
        // Clear the drawn rectangle from the map
        if (this.drawnItems) {
            this.drawnItems.clearLayers();
        }
        
        // Clear GeoJSON layer if it exists
        if (this.geojsonLayer) {
            this.maps.area.removeLayer(this.geojsonLayer);
            this.geojsonLayer = null;
        }
        
        // Disable next button since no valid selection
        if (this.navigation) {
            this.navigation.updateButtonStates();
        }
    }

    isLeafletBounds(spatialFilter) {
        return spatialFilter._southWest && spatialFilter._northEast;
    }

    applyBoundingBoxFilter() {
        const bounds = this.spatialFilter;
        return this.filteredCsvData.filter(point => {
            const lat = parseFloat(point.latitude);
            const lng = parseFloat(point.longitude);
            
            return lat >= bounds.getSouth() && 
                   lat <= bounds.getNorth() && 
                   lng >= bounds.getWest() && 
                   lng <= bounds.getEast();
        });
    }

    applyGeoJSONFilter() {
        // Stage 1: Bounding box pre-filter
        const bounds = this.getGeoJSONBounds(this.spatialFilter);
        const bboxFiltered = this.filteredCsvData.filter(point => {
            const lat = parseFloat(point.latitude);
            const lon = parseFloat(point.longitude);
            return lat >= bounds.south && lat <= bounds.north &&
                   lon >= bounds.west && lon <= bounds.east;
        });
        
        console.log(`🗺️ Stage 1 - Bounding box filter: ${this.filteredCsvData.length} → ${bboxFiltered.length} points`);
        
        // Stage 2: Precise Turf.js filtering
        const pointFeatures = bboxFiltered.map(point => 
            turf.point([parseFloat(point.longitude), parseFloat(point.latitude)])
        );
        const pointsCollection = turf.featureCollection(pointFeatures);
        
        const pointsWithin = turf.pointsWithinPolygon(pointsCollection, this.spatialFilter);
        console.log(`🗺️ Stage 2 - pointsWithinPolygon: ${bboxFiltered.length} → ${pointsWithin.features.length} points`);
        
        // Map back to original data
        const filteredCoordinates = pointsWithin.features.map(feature => feature.geometry.coordinates);
        const filtered = bboxFiltered.filter(point => {
            const pointCoords = [parseFloat(point.longitude), parseFloat(point.latitude)];
            return filteredCoordinates.some(coord => 
                coord[0] === pointCoords[0] && coord[1] === pointCoords[1]
            );
        });
        
        console.log(`🗺️ Total filtering result: ${this.filteredCsvData.length} → ${filtered.length} points`);
        return filtered;
    }

    getGeoJSONBounds(geojson) {
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
        
        return {
            south: minLat,
            north: maxLat,
            west: minLon,
            east: maxLon
        };
    }

    handleGeoJSONUpload(event) {
        const file = event.target.files[0];
        if (file) {
            console.log('📁 GeoJSON file selected:', file.name);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const geojson = JSON.parse(e.target.result);
                    console.log('��️ GeoJSON loaded:', geojson.type);
                    
                    // Clear any existing selections
                    this.clearAreaSelection();
                    
                    // Add GeoJSON to map
                    this.addGeoJSONToMap(geojson);
                    
                    // Set as spatial filter
                    this.spatialFilter = geojson;
                    
                    // Apply spatial filter with Turf.js
                    this.applySpatialFilter();
                    
                } catch (error) {
                    console.error('❌ Invalid GeoJSON file:', error);
                    this.showToast('Invalid GeoJSON file', 'error');
                }
            };
            reader.readAsText(file);
        }
    }
    
    addGeoJSONToMap(geojson) {
        // Clear existing GeoJSON layers
        this.clearGeoJSONLayers();
        
        // Add new GeoJSON layer
        const geojsonLayer = L.geoJSON(geojson, {
            style: {
                color: '#4facfe',
                weight: 2,
                fillColor: '#4facfe',
                fillOpacity: 0.2
            }
        }).addTo(this.maps.area);
        
        // Store reference to remove later
        this.geojsonLayer = geojsonLayer;
        
        // Fit map to GeoJSON bounds
        this.maps.area.fitBounds(geojsonLayer.getBounds());
        
        console.log('🗺️ GeoJSON added to map');
    }
    
    clearGeoJSONLayers() {
        if (this.geojsonLayer) {
            this.maps.area.removeLayer(this.geojsonLayer);
            this.geojsonLayer = null;
        }
    }
    
    clearAreaSelection() {
        // Clear drawn items
        if (this.drawnItems) {
            this.drawnItems.clearLayers();
        }
        
        // Clear GeoJSON layers
        this.clearGeoJSONLayers();
        
        // Reset spatial filter
        this.spatialFilter = null;
        this.areaSelectedCsvData = null;
    }

    setupSampleGeoJSONLoading() {
        const sampleSelect = this.elements.sampleGeojsonSelect;
        
        if (sampleSelect) {
            sampleSelect.addEventListener('change', async (event) => {
                const url = event.target.value;
                if (!url) return;
                
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const geojson = await response.json();
                    
                    // Clear any existing selections
                    this.clearAreaSelection();
                    
                    // Add GeoJSON to map
                    this.addGeoJSONToMap(geojson);
                    
                    // Set as spatial filter
                    this.spatialFilter = geojson;
                    
                    // Apply spatial filter
                    this.applySpatialFilter();
                    
                    // Reset selection
                    sampleSelect.value = '';
                    
                } catch (error) {
                    console.error('❌ Failed to load sample GeoJSON:', error);
                    this.showToast(`Failed to load sample: ${error.message}`, 'error');
                    sampleSelect.value = '';
                }
            });
        }
    }

    setupGeoJSONUpload() {
        const uploadGeojson = this.elements.uploadGeojson;
        const geojsonUpload = this.elements.geojsonUpload;
        
        if (uploadGeojson && geojsonUpload) {
            uploadGeojson.addEventListener('click', () => geojsonUpload.click());
            geojsonUpload.addEventListener('change', (event) => {
                this.handleGeoJSONUpload(event);
            });
        }
    }

    updateAreaSelectionUI() {
        // Show selected area info
        const bounds = this.spatialFilter;
        const coords = {
            north: bounds.getNorth().toFixed(4),
            south: bounds.getSouth().toFixed(4),
            east: bounds.getEast().toFixed(4),
            west: bounds.getWest().toFixed(4)
        };
        
        console.log('📍 Selected area coordinates:', coords);
        
        // You can add a visual indicator here if needed
        // For now, we'll just log it
    }

    clearSpatialFilter() {
        console.log('🗑️ Clearing spatial filter...');
        
        // Clear data state
        this.spatialFilter = null;
        this.areaSelectedCsvData = null;
        
        // Update filter display
        //this.updateActiveFiltersDisplay();
        
        // Clear map visuals
        this.clearMapVisuals();
        
        // Update button states
        if (this.navigation) {
            this.navigation.updateButtonStates();
        }
        
        this.showToast('Geographic area filter removed', 'info');
    }

    clearMapVisuals() {
        if (this.currentStep === 4 && this.maps.area) {
            // Clear drawn items
            if (this.drawnItems) {
                this.drawnItems.clearLayers();
            }
            
            // Reset map view
            this.maps.area.setView([0, 0], 2);
        }
    }
}

// ============================================================================
// STEP NAVIGATION SYSTEM
// ============================================================================

class StepNavigation {
    constructor(appState) {
        this.appState = appState;
        this.setupNavigationListeners();
    }

    setupNavigationListeners() {
        // Start button
        this.addListener('start-button', 'click', () => {
            // This is always the AppState.
            // On click, it calls the funciton navigate to step, with the correct step number.
            this.navigateToStep(2);
        });

        // Back buttons
        this.addListener('back-to-start', 'click', () => {
            this.navigateToStep(1);
        });

        this.addListener('back-to-upload', 'click', () => {
            this.navigateToStep(2);
        });

        this.addListener('back-to-filter', 'click', () => {
            this.navigateToStep(3);
        });

        this.addListener('back-to-area', 'click', () => {
            this.navigateToStep(4);
        });

        this.addListener('back-to-resolution', 'click', () => {
            this.navigateToStep(5);
        });

        // Next buttons
        this.addListener('next-to-filter', 'click', () => {
            this.navigateToStep(3);
        });

        this.addListener('next-to-area', 'click', () => {
            this.navigateToStep(4);
        });

        this.addListener('next-to-resolution', 'click', () => {
            this.navigateToStep(5);
        });

        this.addListener('next-to-download', 'click', () => {
            this.navigateToStep(6);
        });

        // Restart button
        this.addListener('restart-process', 'click', () => {
            this.restartApplication();
        });
    }

    addListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Element with ID '${elementId}' not found`);
        }
    }

    navigateToStep(stepNumber) {
        console.log('🔄 Navigating to step', stepNumber);
        if (this.appState.canProceedToStep(stepNumber)) {
            this.appState.goToStep(stepNumber);
            this.updateButtonStates();
        } else {
            this.showNavigationError(stepNumber);
        }
    }

    updateButtonStates() {
        // Update all navigation buttons based on current state
        this.updateButtonState('next-to-filter', this.appState.canProceedToStep(3));
        this.updateButtonState('next-to-area', this.appState.canProceedToStep(4));
        this.updateButtonState('next-to-resolution', this.appState.canProceedToStep(5));
        this.updateButtonState('next-to-download', this.appState.canProceedToStep(6));
    }

    updateButtonState(buttonId, enabled) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = !enabled; // If True, then disabled is false
            if (enabled) {
                button.classList.remove('button-disabled');
                button.classList.add('button-enabled');
            } else {
                button.classList.remove('button-enabled');
                button.classList.add('button-disabled');
            }
        }
    }

    showNavigationError(stepNumber) {
        const errorMessages = {
            3: 'Please upload a CSV file first',
            4: 'Please review and filter your data first',
            5: 'Please select an area first (draw rectangle or upload GeoJSON)',
            6: 'Please wait for data processing to complete'
        };
        
        const message = errorMessages[stepNumber] || 'Cannot proceed to this step';
        this.showToast(message, 'error');
    }

    restartApplication() {
        console.log('🔄 Restarting application...');
        
        // Reset state
        this.appState.reset();
        
        // Clear any file inputs
        this.clearFileInputs();
        
        // Reset form inputs
        this.resetFormInputs();
        
        // Go back to start
        this.appState.goToStep(1);
        this.updateButtonStates();
        
        this.showToast('Application restarted successfully', 'success');
    }

    clearFileInputs() {
        const csvUpload = document.getElementById('csv-upload');
        const geojsonUpload = document.getElementById('geojson-upload');
        
        if (csvUpload) csvUpload.value = '';
        if (geojsonUpload) geojsonUpload.value = '';
    }

    resetFormInputs() {
        const resolution = document.getElementById('resolution');
        const binStep = document.getElementById('bin-step');
        const binCount = document.getElementById('bin-count');
        
        if (resolution) resolution.value = '2';
        if (binStep) binStep.value = '10';
        if (binCount) binCount.value = '10';
    }

    showToast(message, type = 'info') {
        ToastManager.show(message, type);
    }
}

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

class ToastManager {
    static show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        if (type === 'loading') {
            // Loading toast with spinner
            toast.innerHTML = `
                <div class="toast-content">
                    <div class="loading-spinner"></div>
                    <span>${message}</span>
                </div>
            `;
        } else {
            toast.textContent = message;
        }
        
        document.body.appendChild(toast);
        
        // Auto-remove after duration (except for loading toasts)
        if (type !== 'loading') {
            setTimeout(() => {
                toast.classList.add('slide-out');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
        
        console.log(`📢 Toast [${type}]: ${message}`);
        
        // Return the toast element for loading toasts
        return toast;
    }
    
    // Method to update loading toast to success/error
    static updateLoadingToast(loadingToast, message, type = 'success') {
        if (loadingToast && loadingToast.parentNode) {
            loadingToast.className = `toast ${type}`;
            loadingToast.innerHTML = `
                <div class="toast-content">
                    <span>${message}</span>
                </div>
            `;
            
            // Auto-remove after showing result
            setTimeout(() => {
                loadingToast.classList.add('slide-out');
                setTimeout(() => loadingToast.remove(), 300);
            }, 3000);
        }
    }
    
    // Method to remove loading toast
    static removeLoadingToast(loadingToast) {
        if (loadingToast && loadingToast.parentNode) {
            loadingToast.classList.add('slide-out');
            setTimeout(() => loadingToast.remove(), 300);
        }
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================



// ============================================================================
// INITIALIZATION
// ============================================================================

// Global app instance
let app;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Fire Hexbin Maker...');
    
    // Create app state
    app = new AppState();
    
    // Initialize step navigation
    const navigation = new StepNavigation(app);

    // Give AppState access to navigation for button updates
    app.navigation = navigation
    
    // Set initial state
    app.updateProgress();
    navigation.updateButtonStates();
    
    console.log('✅ Application initialized successfully');
});

// ============================================================================
// STEP INITIALIZATION PLACEHOLDERS
// ============================================================================

