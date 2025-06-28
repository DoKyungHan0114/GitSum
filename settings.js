// DOM elements
const settingsForm = document.getElementById('settingsForm');
const apiKeyInput = document.getElementById('apiKey');
const cancelBtn = document.getElementById('cancelBtn');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');

// Initialize
async function init() {
    // Load existing settings
    const settings = await window.electronAPI.getSettings();
    if (settings.apiKey) {
        apiKeyInput.value = settings.apiKey;
    }

    // Add event listeners
    settingsForm.addEventListener('submit', saveSettings);
    cancelBtn.addEventListener('click', closeWindow);
}

// Save settings
async function saveSettings(event) {
    event.preventDefault();
    
    hideMessages();
    
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        showError('Please enter your API key.');
        return;
    }

    // Validate API key format (basic check)
    if (!apiKey.startsWith('sk-ant-api')) {
        showError('Invalid Claude API key format.');
        return;
    }

    try {
        const settings = {
            apiKey: apiKey,
            lastUpdated: new Date().toISOString()
        };

        const success = await window.electronAPI.saveSettings(settings);
        
        if (success) {
            showSuccess('Settings saved successfully!');
            
            // Close window after a short delay
            setTimeout(() => {
                closeWindow();
            }, 1500);
        } else {
            showError('Error occurred while saving settings.');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Error occurred while saving settings.');
    }
}

// Close window
function closeWindow() {
    window.close();
}

// Show success message
function showSuccess(message) {
    hideMessages();
    successMessage.textContent = message;
    successMessage.style.display = 'block';
}

// Show error message
function showError(message) {
    hideMessages();
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Hide all messages
function hideMessages() {
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
}

// Handle keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeWindow();
    } else if (event.key === 'Enter' && event.ctrlKey) {
        settingsForm.dispatchEvent(new Event('submit'));
    }
});

// Initialize
init(); 