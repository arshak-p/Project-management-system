import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State { failed: boolean }

/** Shows a plain "reload" screen instead of a blank page if something unexpected crashes the app. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-1 text-sm text-slate-500">Reload the page to continue. Your work on the server is safe.</p>
          <button className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
