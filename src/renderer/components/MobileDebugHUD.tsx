import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';
import { getActiveGames } from '../utils/activeGames.js';

/**
 * Tiny on-screen debug HUD. Only renders on mobile-width viewports.
 * Tap to expand/collapse. Shows socket + route state to diagnose blank-page issues.
 * Add ?debug=1 to URL to force show on desktop too. Remove this component
 * once mobile join is confirmed working.
 */
export default function MobileDebugHUD() {
  const { connected, serverUrl } = useSocket();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Re-render every 2s so active games / last error stay current
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 2000);
    return () => clearInterval(t);
  }, []);

  const forceShow = typeof window !== 'undefined' && window.location.search.includes('debug=1');
  if (!isMobile && !forceShow) return null;

  const games = getActiveGames();
  let lastError: { message?: string; at?: string } | null = null;
  try {
    const raw = localStorage.getItem('whosnext_last_error');
    if (raw) lastError = JSON.parse(raw);
  } catch {}

  return (
    <div
      className="fixed bottom-2 left-2 z-[9999] text-[10px] font-mono"
      style={{ pointerEvents: 'auto' }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-1 rounded bg-black/70 text-white border border-white/20"
      >
        {open ? '×' : 'dbg'} {connected ? '🟢' : '🔴'}
      </button>
      {open && (
        <div className="mt-1 max-w-[88vw] bg-black/85 border border-white/20 rounded p-2 text-white/90 leading-snug max-h-[60vh] overflow-auto">
          <div>route: <span className="text-accent">{location.pathname}</span></div>
          <div>sock: {connected ? 'connected' : 'disconnected'}</div>
          <div>url: {serverUrl.replace(/^https?:\/\//, '')}</div>
          <div>ua: {navigator.userAgent.slice(0, 60)}…</div>
          <div className="mt-1">activeGames ({games.length}):</div>
          {games.map((g) => (
            <div key={g.roomCode} className="ml-2 text-white/70">
              {g.roomCode} · {g.playerName} · {g.mode}
            </div>
          ))}
          {lastError && (
            <div className="mt-2">
              <div className="text-red-400">lastError @ {lastError.at?.slice(11, 19)}</div>
              <div className="text-white/70 break-words">{lastError.message}</div>
              <button
                onClick={() => { localStorage.removeItem('whosnext_last_error'); setTick((n) => n + 1); }}
                className="mt-1 px-1.5 py-0.5 rounded bg-white/10 border border-white/20"
              >
                clear
              </button>
            </div>
          )}
          <div className="hidden">{tick}</div>
        </div>
      )}
    </div>
  );
}
