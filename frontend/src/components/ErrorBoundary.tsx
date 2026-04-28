import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-[0.2em]">System Crash Detected</h1>
          <p className="text-slate-400 text-sm max-w-md mb-8 leading-relaxed">
            The dashboard encountered an unexpected rendering error. This usually happens when your browser has cached an old version of the agency platform.
            <br/><br/>
            <span className="text-red-400 font-mono text-[10px] p-3 bg-red-500/5 rounded-xl border border-red-500/10 block break-words">
              {this.state.hasError ? this.state.errorMsg : 'Unknown Error'}
            </span>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <RefreshCcw className="w-4 h-4" /> Force Restart
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
