import { contextBridge, ipcRenderer } from 'electron';
const whosnextAPI = {
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    getServerUrl: () => ipcRenderer.invoke('get-server-url'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    on: (channel, callback) => {
        const listener = (_event, ...args) => callback(...args);
        ipcRenderer.on(channel, listener);
        return () => ipcRenderer.removeListener(channel, listener);
    },
};
contextBridge.exposeInMainWorld('whosnextAPI', whosnextAPI);
