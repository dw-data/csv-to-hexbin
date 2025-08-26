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
                // Upload step - no special initialization needed
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
        const data = this.filteredCsvData || this.originalCsvData || this.csvData;
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
            button.disabled = !enabled;
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
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Auto-remove after duration
        setTimeout(() => {
            toast.classList.add('slide-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
        
        console.log(`📢 Toast [${type}]: ${message}`);
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showToast(message, type = 'info') {
    ToastManager.show(message, type);
}

function enableButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = false;
        button.classList.remove('button-disabled');
        button.classList.add('button-enabled');
    }
}

function disableButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = true;
        button.classList.remove('button-enabled');
        button.classList.add('button-disabled');
    }
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
    
    // Set initial state
    app.updateProgress();
    navigation.updateButtonStates();
    
    console.log('✅ Application initialized successfully');
});

// ============================================================================
// STEP INITIALIZATION PLACEHOLDERS
// ============================================================================

// These will be implemented in the next steps
AppState.prototype.initializeFilterStep = function() {
    console.log('🔍 Initializing filter step...');
    // TODO: Implement filter step initialization
};

AppState.prototype.initializeAreaStep = function() {
    console.log('��️ Initializing area step...');
    // TODO: Implement area step initialization
};

AppState.prototype.initializeResolutionStep = function() {
    console.log('⚙️ Initializing resolution step...');
    // TODO: Implement resolution step initialization
};

AppState.prototype.initializeDownloadStep = function() {
    console.log('📥 Initializing download step...');
    // TODO: Implement download step initialization
};