const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('buddy', {
  onReminder: (callback) => ipcRenderer.on('reminder', (event, data) => callback(data)),
  onCharacterChanged: (callback) => ipcRenderer.on('character-changed', (event, data) => callback(data)),
  onFocusTick: (callback) => ipcRenderer.on('focus-tick', (event, data) => callback(data)),
  onSizeChanged: (callback) => ipcRenderer.on('size-changed', (event, data) => callback(data)),
  onReduceMotionChanged: (callback) => ipcRenderer.on('reduce-motion-changed', (event, data) => callback(data)),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  dragWindow: (dx, dy) => ipcRenderer.invoke('drag-window', { dx, dy }),
  ackReminder: (type) => ipcRenderer.invoke('ack-reminder', type),
  feedBuddy: () => ipcRenderer.invoke('feed-buddy'),
  startFocus: (minutes) => ipcRenderer.invoke('start-focus', minutes),
  cancelFocus: () => ipcRenderer.invoke('cancel-focus'),
  getMood: () => ipcRenderer.invoke('get-mood'),
  addCustomReminder: (reminder) => ipcRenderer.invoke('add-custom-reminder', reminder)
});
