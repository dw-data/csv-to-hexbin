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
    }

    // Step management
    goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > this.totalSteps) {
            console.error(`Invalid step number: ${stepNumber}`);
            return false;
        }

        console.log(`🔄 Navigating from step ${this.currentStep} to step ${stepNumber}`);
        console.log(this);
        
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
        this.csvData = null;
        this.originalCsvData = null;
        this.filteredCsvData = null;
        this.spatialFilter = null;
        this.processedData = null;
        this.activeFilters = {};
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
        
        console.log('🔄 Application state reset');
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
        console.log(this.appState);
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

function showToast(message, type = 'info') {
    ToastManager.show(message, type);
}

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

