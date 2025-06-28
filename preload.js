const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  openBilling: () => ipcRenderer.invoke('open-billing'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getGitLogs: (folderPath, dateRange, selectedBranch) => ipcRenderer.invoke('get-git-logs', folderPath, dateRange, selectedBranch),
  getCurrentBranch: (folderPath) => ipcRenderer.invoke('get-current-branch', folderPath),
  getAllBranches: (folderPath) => ipcRenderer.invoke('get-all-branches', folderPath),
  summarizeCommits: (commits, apiKey, mode, detailLevel) => ipcRenderer.invoke('summarize-commits', commits, apiKey, mode, detailLevel),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  getHotFiles: (folderPath, dateRange, selectedBranch) => ipcRenderer.invoke('get-hot-files', folderPath, dateRange, selectedBranch),
  
  // Add listener for settings updates
  onSettingsUpdated: (callback) => ipcRenderer.on('settings-updated', callback),
  removeSettingsListener: () => ipcRenderer.removeAllListeners('settings-updated')
}); 