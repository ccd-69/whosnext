import React, { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Electron doesn't expose window state to renderer easily; we'll just toggle visually
    // and let the main process handle the actual maximize/unmaximize.
  }, []);

  function handleMinimize() {
    window.whosnextAPI?.minimizeWindow?.();
  }

  function handleMaximize() {
    window.whosnextAPI?.maximizeWindow?.();
    setIsMaximized((prev) => !prev);
  }

  function handleClose() {
    window.whosnextAPI?.closeWindow?.();
  }

  return (
    <div className="h-10 w-full flex items-center justify-between bg-surface/80 border-b border-border select-none shrink-0 z-50">
      <div className="flex-1 h-full flex items-center px-4 app-drag-region">
        <span className="text-sm font-bold text-white/80 tracking-wide">Who's Next?</span>
      </div>

      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="h-full px-4 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Minimize"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-4 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Maximize"
        >
          <Square size={14} />
        </button>
        <button
          onClick={handleClose}
          className="h-full px-4 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-500/80 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
