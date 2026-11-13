import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ShoppingBag, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled React error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleClearSessionAndReload = () => {
    try {
      localStorage.removeItem('mela_token');
      localStorage.removeItem('mela_user');
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 font-sans text-gray-900">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-emerald-100 text-center space-y-5 animate-in fade-in">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center shadow-md">
                <ShoppingBag className="w-5 h-5 text-amber-300" />
              </div>
              <span className="text-xl font-black text-emerald-900">MELA MARKET</span>
            </div>

            {/* Error Icon */}
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* Title & Explanation */}
            <div>
              <h2 className="text-lg font-black text-gray-900">
                ይቅርታ፣ ያልተጠበቀ ችግር አጋጥሟል
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                An unexpected display error occurred. The application prevented a blank screen.
              </p>
            </div>

            {/* Error Message Box */}
            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-800 text-xs font-mono text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>እንደገና ይሞክሩ (Try Again)</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearSessionAndReload}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs py-2.5 rounded-xl transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>መሸጎጫ ያጽዱና ገጹን ያድሱ (Clear Session & Reset)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
