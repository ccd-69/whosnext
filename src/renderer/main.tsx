import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.js';
import './styles/index.css';

// Capture uncaught errors and unhandled promise rejections for mobile debugging.
// Persisted to localStorage so MobileDebugHUD can display them.
function persistError(label: string, msg: string, stack?: string) {
  try {
    localStorage.setItem(
      'whosnext_last_error',
      JSON.stringify({
        message: `[${label}] ${msg}`,
        stack: stack?.slice(0, 2000),
        at: new Date().toISOString(),
      })
    );
  } catch {}
}
window.addEventListener('error', (e) => {
  persistError('window.error', e.message || String(e.error), e.error?.stack);
});
window.addEventListener('unhandledrejection', (e) => {
  const reason: any = e.reason;
  persistError('unhandledrejection', reason?.message || String(reason), reason?.stack);
});

// === DIAG MODE ===
// Load with ?diag=1 to bypass React entirely and render plain HTML.
// Proves whether bundle/CSS/DOM are healthy independent of TitleScreen layout.
const __isDiag = typeof window !== 'undefined' && window.location.search.includes('diag=1');
if (__isDiag) {
  const root = document.getElementById('root');
  if (root) {
    const ua = navigator.userAgent;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio;
    root.innerHTML = '<div style="font-family:monospace;color:#fff;background:#0a0a0f;padding:16px;min-height:100vh;overflow:auto;font-size:14px;line-height:1.6">' +
      '<h1 style="color:#f97316;font-size:20px;margin-bottom:12px">DIAG MODE</h1>' +
      '<div>If you can read this, React mount works and CSS bundle is fine.</div>' +
      '<div>Bug is in TitleScreen layout, not bundle/runtime.</div>' +
      '<hr style="border-color:#333;margin:12px 0"/>' +
      '<div><b>viewport:</b> ' + vw + ' x ' + vh + '</div>' +
      '<div><b>dpr:</b> ' + dpr + '</div>' +
      '<div><b>UA:</b> ' + ua + '</div>' +
      '<div><b>URL:</b> ' + window.location.href + '</div>' +
      '<hr style="border-color:#333;margin:12px 0"/>' +
      '<div style="color:#a3a3a3">Three colored test boxes below should each be visible without scrolling sideways:</div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
        '<div style="width:80px;height:80px;background:#ef4444">red</div>' +
        '<div style="width:80px;height:80px;background:#22c55e">green</div>' +
        '<div style="width:80px;height:80px;background:#3b82f6">blue</div>' +
      '</div>' +
      '<div style="margin-top:16px"><a href="/" style="color:#f97316">&larr; Back to app</a></div>' +
      '</div>';
  }
}
if (!__isDiag) {
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
}
