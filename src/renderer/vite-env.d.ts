/// <reference types="vite/client" />

declare global {
  interface Window {
    whosnextAPI: {
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      getServerUrl: () => Promise<string>;
      openExternal: (url: string) => Promise<void>;
      on: (channel: string, callback: (...args: any[]) => void) => (() => void);
    };
  }
}

export {};
