// DOM elements
const selectFolderBtn = document.getElementById('selectFolderBtn');
const selectedPath = document.getElementById('selectedPath');
const clearFolderBtn = document.getElementById('clearFolderBtn');
const summarizeBtn = document.getElementById('summarizeBtn');
const hotFilesBtn = document.getElementById('hotFilesBtn');
const settingsBtn = document.getElementById('settingsBtn');
const billingBtn = document.getElementById('billingBtn');
const copyBtn = document.getElementById('copyBtn');
const resultSection = document.querySelector('.result-section');
const resultText = document.getElementById('resultText');
const toast = document.getElementById('toast');
const customDateSection = document.getElementById('customDateSection');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');

// Hot files elements
const hotFilesSection = document.querySelector('.hot-files-section');
const hotFilesContent = document.getElementById('hotFilesContent');
const copyHotFilesBtn = document.getElementById('copyHotFilesBtn');

// Branch related DOM elements
const branchInfo = document.getElementById('branchInfo');
const currentBranchElement = document.getElementById('currentBranch');
const branchSection = document.getElementById('branchSection');
const branchSelectSection = document.getElementById('branchSelectSection');
const branchSelect = document.getElementById('branchSelect');

// Detail level elements
const detailLevelSection = document.getElementById('detailLevelSection');

// State
let currentFolderPath = '';
let currentSettings = {};
let currentBranch = '';
let allBranches = [];

// Initialize
async function init() {
    // Load settings
    currentSettings = await window.electronAPI.getSettings();
    
    console.log('App initialized:', {
        hasApiKey: !!currentSettings.apiKey,
        lastSelectedFolder: currentSettings.lastSelectedFolder
    });
    
    // Load last selected folder if exists
    if (currentSettings.lastSelectedFolder) {
        currentFolderPath = currentSettings.lastSelectedFolder;
        selectedPath.textContent = currentFolderPath;
        selectedPath.style.color = '#2d3748';
        clearFolderBtn.style.display = 'block';
        
        // Load branch information
        await loadBranchInformation();
    }
    
    // Update button state
    updateButtonState();
    
    // Listen for settings updates from settings window
    window.electronAPI.onSettingsUpdated(async (event, updatedSettings) => {
        console.log('Settings updated received:', updatedSettings);
        currentSettings = updatedSettings;
        updateButtonState();
        showToast('Settings updated successfully!', 'success');
    });
    
    // Add event listeners
    selectFolderBtn.addEventListener('click', selectFolder);
    clearFolderBtn.addEventListener('click', clearFolder);
    summarizeBtn.addEventListener('click', summarizeCommits);
    hotFilesBtn.addEventListener('click', analyzeHotFiles);
    settingsBtn.addEventListener('click', openSettings);
    billingBtn.addEventListener('click', openBilling);
    copyBtn.addEventListener('click', copyResult);
    copyHotFilesBtn.addEventListener('click', copyHotFiles);
    
    // Add date range change listener
    document.querySelectorAll('input[name="dateRange"]').forEach(radio => {
        radio.addEventListener('change', handleDateRangeChange);
    });
    
    // Add branch option change listener
    document.querySelectorAll('input[name="branchOption"]').forEach(radio => {
        radio.addEventListener('change', handleBranchOptionChange);
    });
    
    // Add summary mode change listener
    document.querySelectorAll('input[name="summaryMode"]').forEach(radio => {
        radio.addEventListener('change', handleSummaryModeChange);
    });
    
    // Initialize detail level visibility
    handleSummaryModeChange();
    
    // Set default end date to today
    const today = new Date().toISOString().split('T')[0];
    endDateInput.value = today;
    
    // Set default start date to 7 days ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    startDateInput.value = weekAgo.toISOString().split('T')[0];
}

// Select folder
async function selectFolder() {
    try {
        const result = await window.electronAPI.selectFolder();
        if (!result.canceled && result.filePaths.length > 0) {
            currentFolderPath = result.filePaths[0];
            selectedPath.textContent = currentFolderPath;
            selectedPath.style.color = '#2d3748';
            
            // Load branch information
            await loadBranchInformation();
            
            // Save selected folder to settings
            const updatedSettings = {
                ...currentSettings,
                lastSelectedFolder: currentFolderPath,
                lastUpdated: new Date().toISOString()
            };
            await window.electronAPI.saveSettings(updatedSettings);
            currentSettings = updatedSettings;
            
            // Show clear button
            clearFolderBtn.style.display = 'block';
            
            // Update button state
            updateButtonState();
            
            console.log('Folder selected:', currentFolderPath);
        }
    } catch (error) {
        console.error('Error selecting folder:', error);
        showToast('Error occurred while selecting folder.', 'error');
    }
}

// Clear selected folder
async function clearFolder() {
    try {
        currentFolderPath = '';
        currentBranch = '';
        allBranches = [];
        selectedPath.textContent = 'No folder selected';
        selectedPath.style.color = '#a0aec0';
        clearFolderBtn.style.display = 'none';
        summarizeBtn.disabled = true;
        hotFilesBtn.disabled = true;
        hideResultSection();
        hideHotFilesSection();
        
        // Hide branch information
        branchInfo.style.display = 'none';
        branchSection.style.display = 'none';
        branchSelectSection.style.display = 'none';
        
        // Remove from settings
        const updatedSettings = {
            ...currentSettings,
            lastSelectedFolder: null,
            lastUpdated: new Date().toISOString()
        };
        await window.electronAPI.saveSettings(updatedSettings);
        currentSettings = updatedSettings;
        
        showToast('Folder selection cleared.', 'info');
    } catch (error) {
        console.error('Error clearing folder:', error);
        showToast('Error occurred while clearing folder.', 'error');
    }
}

// Get selected date range
function getSelectedDateRange() {
    const selectedRadio = document.querySelector('input[name="dateRange"]:checked');
    const value = selectedRadio.value;
    
    if (value === 'custom') {
        return {
            type: 'custom',
            startDate: startDateInput.value,
            endDate: endDateInput.value
        };
    } else {
        return {
            type: 'days',
            days: parseInt(value)
        };
    }
}

// Handle date range change
function handleDateRangeChange() {
    const selectedValue = document.querySelector('input[name="dateRange"]:checked').value;
    
    if (selectedValue === 'custom') {
        customDateSection.style.display = 'block';
    } else {
        customDateSection.style.display = 'none';
    }
}

// Get selected summary mode
function getSelectedSummaryMode() {
    const selectedRadio = document.querySelector('input[name="summaryMode"]:checked');
    return selectedRadio.value;
}

// Get selected detail level
function getSelectedDetailLevel() {
    const selectedRadio = document.querySelector('input[name="detailLevel"]:checked');
    return selectedRadio ? selectedRadio.value : 'brief';
}

// Handle summary mode changes
function handleSummaryModeChange() {
    const mode = getSelectedSummaryMode();
    
    if (mode === 'technical') {
        detailLevelSection.style.display = 'block';
    } else {
        detailLevelSection.style.display = 'none';
    }
}

// Summarize commits
async function summarizeCommits() {
    console.log('Create Huddle button clicked!', {
        hasFolder: !!currentFolderPath,
        hasApiKey: !!currentSettings.apiKey,
        folderPath: currentFolderPath
    });

    if (!currentFolderPath) {
        showToast('❌ Please select a Git repository folder first.', 'error');
        return;
    }

    if (!currentSettings.apiKey) {
        showToast('❌ Please set up your Claude API key in Settings first.', 'error');
        openSettings();
        return;
    }

    const dateRange = getSelectedDateRange();
    const mode = getSelectedSummaryMode();
    const detailLevel = getSelectedDetailLevel();
    const selectedBranch = getSelectedBranch();
    
    // Validate custom date range
    if (dateRange.type === 'custom') {
        if (!dateRange.startDate || !dateRange.endDate) {
            showToast('Please select both start and end dates.', 'error');
            return;
        }
        
        if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
            showToast('Start date must be before end date.', 'error');
            return;
        }
    }
    
    // Show loading state
    setLoadingState(true);
    hideResultSection();
    hideHotFilesSection();

    try {
        // Get git logs
        const gitLogs = await window.electronAPI.getGitLogs(currentFolderPath, dateRange, selectedBranch);
        
        if (!gitLogs.trim()) {
            let periodText;
            if (dateRange.type === 'custom') {
                periodText = `the selected period (${dateRange.startDate} to ${dateRange.endDate})`;
            } else {
                periodText = dateRange.days === 0 ? 'today' : `the selected period (${dateRange.days} days)`;
            }
            const branchName = getBranchDisplayName(selectedBranch);
            showToast(`No commits found in ${periodText} on branch "${branchName}".`, 'warning');
            setLoadingState(false);
            return;
        }

        // Summarize with Claude
        const summary = await window.electronAPI.summarizeCommits(gitLogs, currentSettings.apiKey, mode, detailLevel);
        
        // Show result with branch information
        const branchName = getBranchDisplayName(selectedBranch);
        showResult(summary, branchName, dateRange);
        showToast('Huddle notes created successfully!', 'success');
        
    } catch (error) {
        console.error('Error summarizing commits:', error);
        let errorMessage = 'An error occurred while creating huddle notes.';
        
        if (error.message.includes('401')) {
            errorMessage = 'Invalid API key. Please check your settings.';
        } else if (error.message.includes('git')) {
            errorMessage = 'Selected folder is not a Git repository or Git is not installed.';
        } else if (error.message.includes('rate limit')) {
            errorMessage = 'API rate limit exceeded. Please try again later.';
        }
        
        showToast(errorMessage, 'error');
    } finally {
        setLoadingState(false);
    }
}

// Analyze hot files
async function analyzeHotFiles() {
    console.log('Hot Files Analysis button clicked!', {
        hasFolder: !!currentFolderPath,
        folderPath: currentFolderPath
    });

    if (!currentFolderPath) {
        showToast('❌ Please select a Git repository folder first.', 'error');
        return;
    }

    const dateRange = getSelectedDateRange();
    const selectedBranch = getSelectedBranch();
    
    // Validate custom date range
    if (dateRange.type === 'custom') {
        if (!dateRange.startDate || !dateRange.endDate) {
            showToast('Please select both start and end dates.', 'error');
            return;
        }
        
        if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
            showToast('Start date must be before end date.', 'error');
            return;
        }
    }
    
    // Show loading state for hot files button
    setHotFilesLoadingState(true);
    hideHotFilesSection();
    hideResultSection();

    try {
        // Get hot files data
        const hotFiles = await window.electronAPI.getHotFiles(currentFolderPath, dateRange, selectedBranch);
        
        if (hotFiles.length === 0) {
            let periodText;
            if (dateRange.type === 'custom') {
                periodText = `the selected period (${dateRange.startDate} to ${dateRange.endDate})`;
            } else {
                periodText = dateRange.days === 0 ? 'today' : `the selected period (${dateRange.days} days)`;
            }
            const branchName = getBranchDisplayName(selectedBranch);
            showToast(`No file changes found in ${periodText} on branch "${branchName}".`, 'warning');
            setHotFilesLoadingState(false);
            return;
        }

        // Show hot files analysis
        const branchName = getBranchDisplayName(selectedBranch);
        showHotFiles(hotFiles, branchName, dateRange);
        showToast('Hot files analysis completed successfully!', 'success');
        
    } catch (error) {
        console.error('Error analyzing hot files:', error);
        let errorMessage = 'An error occurred while analyzing hot files.';
        
        if (error.message.includes('git')) {
            errorMessage = 'Selected folder is not a Git repository or Git is not installed.';
        }
        
        showToast(errorMessage, 'error');
    } finally {
        setHotFilesLoadingState(false);
    }
}

// Set loading state
function setLoadingState(isLoading) {
    const btnText = summarizeBtn.querySelector('.btn-text');
    const spinner = summarizeBtn.querySelector('.loading-spinner');
    
    if (isLoading) {
        summarizeBtn.disabled = true;
        btnText.style.display = 'none';
        spinner.style.display = 'block';
    } else {
        summarizeBtn.disabled = !currentFolderPath || !currentSettings.apiKey;
        btnText.style.display = 'block';
        spinner.style.display = 'none';
    }
}

// Set hot files loading state
function setHotFilesLoadingState(isLoading) {
    const btnText = hotFilesBtn.querySelector('.btn-text');
    const spinner = hotFilesBtn.querySelector('.loading-spinner');
    
    if (isLoading) {
        hotFilesBtn.disabled = true;
        btnText.style.display = 'none';
        spinner.style.display = 'block';
    } else {
        hotFilesBtn.disabled = !currentFolderPath;
        btnText.style.display = 'block';
        spinner.style.display = 'none';
    }
}

// Show result
function showResult(summary, branchName, dateRange) {
    // Create header with branch and date information
    let periodText;
    if (dateRange.type === 'custom') {
        periodText = `${dateRange.startDate} to ${dateRange.endDate}`;
    } else {
        periodText = dateRange.days === 0 ? 'Today' : `Last ${dateRange.days} days`;
    }
    
    const header = `🤝 Huddle Notes for branch "${branchName}" (${periodText})\n\n`;
    const resultContent = header + summary;
    
    resultText.textContent = resultContent;
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

// Hide result sections
function hideResultSection() {
    resultSection.style.display = 'none';
}

// Hide hot files section
function hideHotFilesSection() {
    hotFilesSection.style.display = 'none';
}

// Copy result to clipboard
async function copyResult() {
    try {
        await window.electronAPI.copyToClipboard(resultText.textContent);
        showToast('Copied to clipboard!', 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showToast('Error occurred while copying.', 'error');
    }
}

// Show hot files analysis
function showHotFiles(hotFiles, branchName, dateRange) {
    if (hotFiles.length === 0) {
        hotFilesContent.innerHTML = '<div class="no-hot-files">No file changes found in the selected period.</div>';
        hotFilesSection.style.display = 'block';
        return;
    }

    // Create header with branch and date information
    let periodText;
    if (dateRange.type === 'custom') {
        periodText = `${dateRange.startDate} to ${dateRange.endDate}`;
    } else {
        periodText = dateRange.days === 0 ? 'Today' : `Last ${dateRange.days} days`;
    }

    const header = `
        <div class="hot-files-header">
            <h3>🔥 Most Active Files on "${branchName}" (${periodText})</h3>
            <p class="hot-files-subtitle">Files ranked by number of commits that modified them</p>
        </div>
    `;

    // Calculate max count for bar scaling
    const maxCount = Math.max(...hotFiles.map(f => f.count));

    // Create hot files list
    const filesList = hotFiles.map((fileData, index) => {
        const percentage = (fileData.count / maxCount) * 100;
        const fileName = fileData.file.split('/').pop(); // Get just filename
        const filePath = fileData.file;
        const heatLevel = getHeatLevel(percentage);
        
        return `
            <div class="hot-file-item">
                <div class="hot-file-rank">#${index + 1}</div>
                <div class="hot-file-info">
                    <div class="hot-file-name" title="${filePath}">${fileName}</div>
                    <div class="hot-file-path">${filePath}</div>
                    <div class="hot-file-bar-container">
                        <div class="hot-file-bar ${heatLevel}" style="width: ${percentage}%"></div>
                        <div class="hot-file-count">${fileData.count} commits</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Summary stats
    const totalFiles = hotFiles.length;
    const totalCommits = hotFiles.reduce((sum, f) => sum + f.count, 0);
    const topFile = hotFiles[0];
    
    const summary = `
        <div class="hot-files-summary">
            <div class="summary-stat">
                <span class="stat-value">${totalFiles}</span>
                <span class="stat-label">files changed</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${totalCommits}</span>
                <span class="stat-label">total modifications</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${topFile.count}</span>
                <span class="stat-label">max changes (${topFile.file.split('/').pop()})</span>
            </div>
        </div>
    `;

    hotFilesContent.innerHTML = header + summary + '<div class="hot-files-list">' + filesList + '</div>';
    hotFilesSection.style.display = 'block';
    hotFilesSection.scrollIntoView({ behavior: 'smooth' });
}

// Get heat level based on percentage
function getHeatLevel(percentage) {
    if (percentage >= 80) return 'heat-extreme';
    if (percentage >= 60) return 'heat-high';
    if (percentage >= 40) return 'heat-medium';
    if (percentage >= 20) return 'heat-low';
    return 'heat-minimal';
}

// Copy hot files to clipboard
async function copyHotFiles() {
    try {
        // Create text version of hot files analysis
        const headerElement = hotFilesContent.querySelector('.hot-files-header h3');
        const summaryStats = Array.from(hotFilesContent.querySelectorAll('.summary-stat')).map(stat => {
            const value = stat.querySelector('.stat-value').textContent;
            const label = stat.querySelector('.stat-label').textContent;
            return `${value} ${label}`;
        }).join(', ');
        
        const fileItems = Array.from(hotFilesContent.querySelectorAll('.hot-file-item')).map(item => {
            const rank = item.querySelector('.hot-file-rank').textContent;
            const name = item.querySelector('.hot-file-name').textContent;
            const path = item.querySelector('.hot-file-path').textContent;
            const count = item.querySelector('.hot-file-count').textContent;
            return `${rank} ${name} (${path}) - ${count}`;
        }).join('\n');

        const textContent = `${headerElement.textContent}\n\nSummary: ${summaryStats}\n\nTop Files:\n${fileItems}`;
        
        await window.electronAPI.copyToClipboard(textContent);
        showToast('Hot files analysis copied to clipboard!', 'success');
    } catch (error) {
        console.error('Error copying hot files to clipboard:', error);
        showToast('Error occurred while copying hot files.', 'error');
    }
}

// Open settings
function openSettings() {
    window.electronAPI.openSettings();
}

// Open billing page
function openBilling() {
    window.electronAPI.openBilling();
}

// Show toast message
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = 'toast show';
    
    // Set color based on type
    switch (type) {
        case 'success':
            toast.style.background = '#48bb78';
            break;
        case 'error':
            toast.style.background = '#f56565';
            break;
        case 'warning':
            toast.style.background = '#ed8936';
            break;
        default:
            toast.style.background = '#4299e1';
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Update button state when settings change
function updateButtonState() {
    const hasFolder = !!currentFolderPath;
    const hasApiKey = !!currentSettings.apiKey;
    
    // Update summarize button
    summarizeBtn.disabled = !hasFolder || !hasApiKey;
    
    // Update summarize button text based on state
    const summarizeBtnText = summarizeBtn.querySelector('.btn-text');
    
    if (!hasFolder) {
        summarizeBtnText.textContent = '📁 Select Repository First';
    } else if (!hasApiKey) {
        summarizeBtnText.textContent = '⚙️ Setup API Key First';
    } else {
        summarizeBtnText.textContent = '📊 Summarize';
    }
    
    // Update hot files button (doesn't need API key)
    hotFilesBtn.disabled = !hasFolder;
    
    // Update hot files button text based on state
    const hotFilesBtnText = hotFilesBtn.querySelector('.btn-text');
    
    if (!hasFolder) {
        hotFilesBtnText.textContent = '📁 Select Repository First';
    } else {
        hotFilesBtnText.textContent = '🔥 Hot Files Analysis';
    }
    
    // Console log for debugging
    console.log('Button state update:', {
        hasFolder,
        hasApiKey,
        summarizeDisabled: summarizeBtn.disabled,
        hotFilesDisabled: hotFilesBtn.disabled,
        folderPath: currentFolderPath,
        hasApiKeyValue: !!currentSettings.apiKey
    });
}

// Load branch information
async function loadBranchInformation() {
    try {
        // Get current branch
        currentBranch = await window.electronAPI.getCurrentBranch(currentFolderPath);
        
        // Get all branches
        allBranches = await window.electronAPI.getAllBranches(currentFolderPath);
        
        // Update UI
        updateBranchUI();
        
    } catch (error) {
        console.error('Error loading branch information:', error);
        showToast('Error loading repository information. Make sure this is a Git repository.', 'warning');
    }
}

// Update branch UI
function updateBranchUI() {
    if (currentBranch) {
        // Show current branch info
        currentBranchElement.textContent = currentBranch;
        branchInfo.style.display = 'block';
        branchSection.style.display = 'block';
        
        // Populate branch select
        branchSelect.innerHTML = '';
        allBranches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.name;
            option.textContent = branch.displayName + (branch.isCurrent ? ' (current)' : '');
            if (branch.isCurrent) {
                option.selected = true;
            }
            branchSelect.appendChild(option);
        });
    }
}

// Handle branch option change
function handleBranchOptionChange() {
    const selectedValue = document.querySelector('input[name="branchOption"]:checked').value;
    
    if (selectedValue === 'select') {
        branchSelectSection.style.display = 'block';
    } else {
        branchSelectSection.style.display = 'none';
    }
}

// Get selected branch
function getSelectedBranch() {
    const branchOption = document.querySelector('input[name="branchOption"]:checked').value;
    
    if (branchOption === 'current') {
        return 'current';
    } else {
        return branchSelect.value || currentBranch;
    }
}

// Get branch display name for results
function getBranchDisplayName(selectedBranch) {
    if (selectedBranch === 'current') {
        return currentBranch;
    }
    
    const branch = allBranches.find(b => b.name === selectedBranch);
    return branch ? branch.displayName : selectedBranch;
}

// Initialize app
init(); 