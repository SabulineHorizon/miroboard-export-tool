const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('miroDesktop', {
  chooseFolder: () => ipcRenderer.invoke('desktop:choose-folder'),
  openFolder: () => ipcRenderer.invoke('desktop:open-folder'),
  exportBoard: settings => ipcRenderer.invoke('desktop:export', settings),
  onProgress: callback => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('desktop:progress', listener);
    return () => ipcRenderer.removeListener('desktop:progress', listener);
  },
});
