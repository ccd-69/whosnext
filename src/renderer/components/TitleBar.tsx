import React, { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(!!window.whosnextAPI);
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

  // Hide entirely on web (non-Electron) - frame chrome is desktop-only
  if (!isElectron) return null;

  return (
    <div className="h-10 w-full flex items-center justify-between bg-surface/80 border-b border-border select-none shrink-0 z-50">
      <div className={`h-full flex items-center px-4 ${isElectron ? 'flex-1 app-drag-region' : ''}`}>
        <span className="text-sm font-bold text-white/80 tracking-wide">Who's Next?</span>
      </div>

      {isElectron && (
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
      )}
    </div>
  );
}
