'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface border border-border rounded-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-danger" />
            </div>
            <h2 className="text-xl font-condensed font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted mb-6">
              We encountered an unexpected error. Please try again or contact support if the problem persists.
            </p>
            <div className="space-y-2">
              <Button onClick={this.handleRetry} className="w-full">
                Try Again
              </Button>
              <Button variant="ghost" onClick={() => window.location.href = '/dashboard'} className="w-full">
                Go to Dashboard
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-6 text-left">
                <p className="text-xs font-mono text-danger mb-2">Error Details:</p>
                <pre className="text-xs bg-surface-2 p-3 rounded overflow-auto max-h-40">
                  {this.state.error.message}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
