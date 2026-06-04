import { contextBridge, ipcRenderer } from 'electron';

const whosnextAPI = {
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  getServerUrl: () => ipcRenderer.invoke('get-server-url') as Promise<string>,
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  on: (channel: string, callback: (...args: any[]) => void) => {
    const listener = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
};

contextBridge.exposeInMainWorld('whosnextAPI', whosnextAPI);

declare global {
  interface Window {
    whosnextAPI: typeof whosnextAPI;
  }
}
