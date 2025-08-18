'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ModernCard, ModernCardHeader, ModernCardBody } from '../shared/components/ui/ModernCard';
import { ModernButton } from '../shared/components/ui/ModernButton';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call optional onError callback
    this.props.onError?.(error, errorInfo);
    
    // Log to external error tracking service (if available)
    if (typeof window !== 'undefined') {
      // You can integrate with Sentry, LogRocket, etc. here
      console.log('Error details for monitoring service:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    }
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <ModernCard variant="glass" className="w-full max-w-md">
            <ModernCardHeader>
              <div className="text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Something went wrong
                </h2>
                <p className="text-gray-300 text-sm">
                  We encountered an unexpected error. This has been logged for investigation.
                </p>
              </div>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="space-y-4">
                {/* Error details (only in development) */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
                    <h4 className="text-red-300 font-medium text-sm mb-2">Development Error Details:</h4>
                    <div className="text-red-400 text-xs font-mono overflow-x-auto">
                      <div className="mb-1">{this.state.error.message}</div>
                      {this.state.error.stack && (
                        <pre className="whitespace-pre-wrap text-xs">
                          {this.state.error.stack}
                        </pre>
                      )}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-3">
                  <ModernButton 
                    variant="primary" 
                    onClick={this.handleReset}
                    fullWidth
                  >
                    Try Again
                  </ModernButton>
                  <ModernButton 
                    variant="secondary" 
                    onClick={this.handleReload}
                    fullWidth
                  >
                    Refresh Page
                  </ModernButton>
                  <ModernButton 
                    variant="ghost" 
                    onClick={() => window.history.back()}
                    fullWidth
                  >
                    Go Back
                  </ModernButton>
                </div>

                {/* Contact support */}
                <div className="text-center pt-3 border-t border-gray-700/50">
                  <p className="text-gray-400 text-xs">
                    If this error persists, please contact{' '}
                    <a 
                      href="mailto:support@sportsarb.com" 
                      className="text-blue-400 hover:text-blue-300"
                    >
                      support@sportsarb.com
                    </a>
                  </p>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // Log to monitoring service
    if (typeof window !== 'undefined') {
      console.log('Error details for monitoring service:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    }
  }, []);

  return { handleError };
};

// Higher-order component for adding error boundary to any component
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryConfig?: {
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  }
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary 
        fallback={errorBoundaryConfig?.fallback}
        onError={errorBoundaryConfig?.onError}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default ErrorBoundary;