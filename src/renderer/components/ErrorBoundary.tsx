import React from 'react';

interface State {
  error: Error | null;
  info: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Surface to console and persist last error for mobile debug overlay
    console.error('[ErrorBoundary]', error, info);
    try {
      localStorage.setItem(
        'whosnext_last_error',
        JSON.stringify({
          message: error.message,
          stack: error.stack?.slice(0, 2000),
          componentStack: info.componentStack?.slice(0, 2000),
          at: new Date().toISOString(),
        })
      );
    } catch {}
    this.setState({ info });
  }

  handleReset = () => {
    this.setState({ error: null, info: null });
  };

  handleHome = () => {
    this.setState({ error: null, info: null });
    window.location.href = '/';
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="h-full w-full overflow-auto p-4 text-white" style={{ background: '#0a0a0f' }}>
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <h1 className="text-2xl font-black text-red-400">Something broke 🤖💥</h1>
          <p className="text-white/70 text-sm">
            The UI crashed. Showing the error so we can fix it instead of leaving you on a blank page.
          </p>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs font-mono overflow-x-auto">
            <div className="font-bold mb-1">{error.name}: {error.message}</div>
            {error.stack && (
              <pre className="whitespace-pre-wrap break-words text-white/60 mt-2">{error.stack}</pre>
            )}
          </div>
          {info?.componentStack && (
            <details className="bg-surface-light/40 border border-border rounded-xl p-3 text-xs">
              <summary className="cursor-pointer font-semibold">Component stack</summary>
              <pre className="whitespace-pre-wrap break-words text-white/60 mt-2">{info.componentStack}</pre>
            </details>
          )}
          <div className="flex gap-2 flex-wrap">
            <button onClick={this.handleReset} className="btn-primary">Try again</button>
            <button onClick={this.handleHome} className="btn-secondary">Main menu</button>
          </div>
        </div>
      </div>
    );
  }
}
