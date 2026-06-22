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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
