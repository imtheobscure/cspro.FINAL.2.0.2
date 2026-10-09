import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  logError: (message: string, stack?: string) => void;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  // Fix: Replaced class field state initialization with a constructor.
  // This resolves an issue where `this.props` was not being recognized,
  // likely due to a build toolchain misconfiguration with class field syntax.
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React error:", error, errorInfo);
    this.props.logError(error.message, errorInfo.componentStack || undefined);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center p-10 min-h-screen flex flex-col justify-center items-center bg-background-light">
            <h1 className="text-4xl font-bold text-brand-red">Oops! Something went wrong.</h1>
            <p className="mt-4 text-lg text-brand-gray-dark">We've logged the error and our team will look into it. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-brand-blue text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
