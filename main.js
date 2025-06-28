const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');

let mainWindow;
let settingsWindow;

// Settings file path
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// Create main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create settings window
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 400,
    height: 300,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  settingsWindow.loadFile('settings.html');

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// App ready
app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// IPC handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

ipcMain.handle('open-settings', () => {
  createSettingsWindow();
});

ipcMain.handle('open-billing', () => {
  shell.openExternal('https://console.anthropic.com/settings/plans');
});

ipcMain.handle('get-settings', () => {
  try {
    if (fs.existsSync(settingsPath)) {
      const settings = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(settings);
    }
  } catch (error) {
    console.error('Error reading settings:', error);
  }
  return {};
});

ipcMain.handle('save-settings', (event, settings) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    // Notify main window about settings update
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-updated', settings);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
});

ipcMain.handle('get-git-logs', async (event, folderPath, dateRange, selectedBranch) => {
  return new Promise((resolve, reject) => {
    let command;
    
    // Branch specification - if selectedBranch is provided, use it
    const branchSpec = selectedBranch && selectedBranch !== 'current' ? selectedBranch : '';
    
    if (dateRange.type === 'custom') {
      // Custom date range
      const startDate = dateRange.startDate + ' 00:00:00';
      const endDate = dateRange.endDate + ' 23:59:59';
      command = `git log ${branchSpec} --since="${startDate}" --until="${endDate}" --pretty=format:"%h - %an, %ar : %s" --no-merges`;
    } else if (dateRange.days === 0) {
      // Today only
      const today = new Date().toISOString().split('T')[0];
      command = `git log ${branchSpec} --since="${today} 00:00:00" --until="${today} 23:59:59" --pretty=format:"%h - %an, %ar : %s" --no-merges`;
    } else {
      // Previous days
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - dateRange.days);
      const sinceDateStr = sinceDate.toISOString().split('T')[0];
      command = `git log ${branchSpec} --since="${sinceDateStr}" --pretty=format:"%h - %an, %ar : %s" --no-merges`;
    }
    
    exec(command, { cwd: folderPath }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
});

// Get current branch
ipcMain.handle('get-current-branch', async (event, folderPath) => {
  return new Promise((resolve, reject) => {
    exec('git branch --show-current', { cwd: folderPath }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
});

// Get all branches
ipcMain.handle('get-all-branches', async (event, folderPath) => {
  return new Promise((resolve, reject) => {
    exec('git branch -a', { cwd: folderPath }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      // Parse branches and clean up the output
      const branches = stdout.split('\n')
        .map(branch => branch.trim())
        .filter(branch => branch && !branch.startsWith('remotes/origin/HEAD'))
        .map(branch => {
          // Remove current branch indicator (*) and clean up
          let cleanBranch = branch.replace(/^\*\s*/, '').trim();
          
          // Handle remote branches
          if (cleanBranch.startsWith('remotes/origin/')) {
            cleanBranch = cleanBranch.replace('remotes/origin/', '');
          }
          
          const isCurrent = branch.startsWith('*');
          const isRemote = branch.includes('remotes/origin/');
          
          return {
            name: cleanBranch,
            displayName: cleanBranch,
            isCurrent: isCurrent,
            isRemote: isRemote
          };
        })
        // Remove duplicates (local and remote versions of same branch)
        .filter((branch, index, self) => 
          index === self.findIndex(b => b.name === branch.name)
        );
      
      resolve(branches);
    });
  });
});

ipcMain.handle('summarize-commits', async (event, commits, apiKey, mode, detailLevel) => {
  try {
    let prompt;
    
    if (mode === 'technical') {
      if (detailLevel === 'brief') {
        prompt = `Please summarize the following Git commit logs in English for a technical audience (developers). Keep it very brief and focused on only the most critical changes:

${commits}

Please provide a concise summary with:
- Top 2-3 most important changes only
- Each point in 1 line maximum
- Focus on user-facing features and critical fixes only`;
      } else if (detailLevel === 'moderate') {
        prompt = `Please summarize the following Git commit logs in English for a technical audience (developers). Provide a balanced overview:

${commits}

Please organize the summary with:
- Key features/functionality added or modified (3-4 items max)
- Important bug fixes 
- Notable refactoring/improvements

Keep each point to 1-2 lines. Balance between brevity and useful detail.`;
      } else { // detailed
        prompt = `Please summarize the following Git commit logs in English for a technical audience (developers). Provide a comprehensive analysis:

${commits}

Summary format:
1. Major Features Added/Changed
2. Bug Fixes
3. Code Improvements/Refactoring
4. Other Changes

Please provide detailed technical information including:
- Component/module names where relevant
- Technical implementation details
- Impact on architecture or performance
- Dependencies and integration changes`;
      }
    } else {
      prompt = `Please summarize the following Git commit logs in English for a general business audience (non-developers). This summary will be used in a quick team summary, so please provide a very brief 1-2 sentence summary focusing on the main accomplishments and user impact:

${commits}

Please provide a concise summary in 1-2 sentences that covers:
- Key features or improvements delivered
- Major issues resolved (if any)
- Overall impact on the product/users

Use simple, non-technical language that can be easily shared in a quick team summary.`;
    }

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });

    return response.data.content[0].text;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('copy-to-clipboard', async (event, text) => {
  const { clipboard } = require('electron');
  clipboard.writeText(text);
});

// Get hot files analysis
ipcMain.handle('get-hot-files', async (event, folderPath, dateRange, selectedBranch) => {
  return new Promise((resolve, reject) => {
    let command;
    
    // Branch specification - if selectedBranch is provided, use it
    const branchSpec = selectedBranch && selectedBranch !== 'current' ? selectedBranch : '';
    
    if (dateRange.type === 'custom') {
      // Custom date range
      const startDate = dateRange.startDate + ' 00:00:00';
      const endDate = dateRange.endDate + ' 23:59:59';
      command = `git log ${branchSpec} --since="${startDate}" --until="${endDate}" --name-only --pretty=format: --no-merges`;
    } else if (dateRange.days === 0) {
      // Today only
      const today = new Date().toISOString().split('T')[0];
      command = `git log ${branchSpec} --since="${today} 00:00:00" --until="${today} 23:59:59" --name-only --pretty=format: --no-merges`;
    } else {
      // Previous days
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - dateRange.days);
      const sinceDateStr = sinceDate.toISOString().split('T')[0];
      command = `git log ${branchSpec} --since="${sinceDateStr}" --name-only --pretty=format: --no-merges`;
    }
    
    exec(command, { cwd: folderPath }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      // Process the output to count file changes
      const fileChanges = {};
      const lines = stdout.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('commit') && !line.startsWith('Author') && !line.startsWith('Date'));
      
      lines.forEach(file => {
        if (file) {
          fileChanges[file] = (fileChanges[file] || 0) + 1;
        }
      });
      
      // Sort by change count and get top files
      const sortedFiles = Object.entries(fileChanges)
        .map(([file, count]) => ({ file, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15); // Top 15 files
      
      resolve(sortedFiles);
    });
  });
});