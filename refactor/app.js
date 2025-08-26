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
            case 2: // Upload -> Filter
                return this.csvData !== null;
            case 3: // Filter -> Area
                return this.hasValidData();
            case 4: // Area -> Resolution
                return this.spatialFilter !== null;
            case 5: // Resolution -> Download
                return this.processedData !== null;
            default:
                return true;
        }
    }

    hasValidData() {
        const data = this.filteredCsvData || this.originalCsvData;
        return data && data.length > 0;
    }

    // Utility methods
    reset() {
        this.currentStep = 1;

        this.rawCsv = null;
        this.originalCsvData = null;
        this.filteredCsvData = null;
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
            this.csvData = parsedData;
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
        
        // Create data preview
        this.createDataPreview();

        // Initialize active filters display
        this.updateActiveFiltersDisplay();
        
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
        console.log(`�� Opening filter popup for column: ${column}`);
        
        // Get the existing popup element
        const popup = document.getElementById('filter-popup');
        if (!popup) return;
        
        // Update the popup title
        const title = document.getElementById('filter-popup-title');
        if (title) {
            title.textContent = `Filter: ${column}`;
        }
        
        // Update filter type selector
        const typeSelector = document.getElementById('filter-type-selector');
        if (typeSelector) {
            typeSelector.value = 'categorical'; // Default to categorical
            typeSelector.dataset.column = column;
        }
        
        // Update filter content
        const filterContent = document.getElementById('filter-content');
        if (filterContent) {
            filterContent.innerHTML = this.createFilterContent(column, data, 'categorical');
            filterContent.dataset.column = column;
        }
        
        // Setup event listeners
        this.setupFilterPopupListeners(column, data);
        
        // Show the popup
        popup.style.display = 'flex';

    }

    closeFilterPopup() {
        const popup = document.getElementById('filter-popup');
        if (popup) {
            popup.style.display = 'none';
        }
    }

    setupFilterPopupListeners(column, data) {
        // Filter type change listener
        const typeSelector = document.getElementById('filter-type-selector');
        if (typeSelector) {
            typeSelector.removeEventListener('change', this.handleFilterTypeChange);
            typeSelector.addEventListener('change', (e) => {
                this.handleFilterTypeChange(column, e.target.value, data);
            });
        }
        
        // Apply filter button
        const applyBtn = document.getElementById('apply-filter-btn');
        if (applyBtn) {
            applyBtn.removeEventListener('click', this.handleApplyFilter);
            applyBtn.addEventListener('click', () => {
                this.handleApplyFilter(column);
            });
        }
        
        // Clear filter button
        const clearBtn = document.getElementById('clear-filter-btn');
        if (clearBtn) {
            clearBtn.removeEventListener('click', this.handleClearFilter);
            clearBtn.addEventListener('click', () => {
                this.handleClearFilter(column);
            });
        }
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
        
        // Collect filter values and apply them
        const filterData = this.collectFilterData(column);
        if (filterData) {
            this.activeFilters[column] = filterData;
            this.applyFilters();
            this.closeFilterPopup();
            this.showToast(`Filter applied to ${column}`, 'success');
        }
    }
    
    handleClearFilter(column) {
        console.log(`🗑️ Clearing filter for column: ${column}`);
        
        delete this.activeFilters[column];
        this.applyFilters();
        this.closeFilterPopup();
        this.showToast(`Filter cleared for ${column}`, 'info');
    }
    
    collectFilterData(column) {
        console.log("Collecting filter data for column:", column);
        const filterType = document.getElementById('filter-type-selector').value;
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
        const uncheckedBoxes = document.querySelectorAll(`#filter-content input[type="checkbox"]:not(:checked)`);
        const excludedValues = Array.from(uncheckedBoxes).map(cb => cb.value);
        
        if (excludedValues.length === 0) return null;
        
        return {
            type: 'categorical',
            exclude: excludedValues
        };
    }
    
    collectNumericFilterData(column) {
        const minInput = document.querySelector('#filter-content .min-input');
        const maxInput = document.querySelector('#filter-content .max-input');
        
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
        const dateFrom = document.querySelector('#filter-content .date-from');
        const dateTo = document.querySelector('#filter-content .date-to');
        
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

        console.log(this.originalCsvData);
        
        let html = `
            <div class="categorical-filter">
                <div class="filter-summary">
                    ${hasMore ? `<span class="more-indicator">Showing first 100 for performance reasons – consider limiting the amount of categories or using a different filter type)</span>` : ''}
                    <br><br><span>${uniqueValues.length} unique values</span>
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
        document.querySelectorAll(`#filter-content input[type="checkbox"][data-column="${column}"]`).forEach(checkbox => {
            checkbox.checked = true;
        });
    }
    
    clearAllValues(column) {
        document.querySelectorAll(`#filter-content input[type="checkbox"][data-column="${column}"]`).forEach(checkbox => {
            checkbox.checked = false;
        });
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
        
        // Reapply filters
        this.applyFilters();
        
        // Update the display
        this.updateActiveFiltersDisplay();
        
        this.showToast(`Filter removed from ${column}`, 'info');
    }
    



    // Toast method
    showToast(message, type = 'info') {
        return ToastManager.show(message, type);
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

