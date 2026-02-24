import { Component, ErrorInfo, ReactNode } from 'react';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isCopied: boolean;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isCopied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log to console in development
    if (env.app.isDev) {
      logger.error('ErrorBoundary caught an error:', error);
    }

    // Error tracking service can be integrated here (e.g., Sentry)
  }

  handleReload = () => {
    window.location.reload();
  };

  handleCopyError = () => {
    const errorText = `Error: ${this.state.error?.message}\n\nStack:\n${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errorText);
    this.setState({ isCopied: true });
    toast.success('Hata detayları kopyalandı');

    setTimeout(() => {
      this.setState({ isCopied: false });
    }, 2000);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-background z-[9999]">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-2xl space-y-6">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>

            {/* Error Message */}
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">
                Bir Şeyler Ters Gitti
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin. Sorun
                devam ederse lütfen bizimle iletişime geçin.
              </p>
            </div>

            {/* Error Details (Dev only) */}
            {env.app.isDev && this.state.error && (
              <div className="bg-muted/50 rounded-lg p-4 text-left border border-border/50 relative group">
                <button
                  onClick={this.handleCopyError}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-background/50 hover:bg-background border border-border/50 transition-colors"
                  title="Hatayı kopyala"
                >
                  {this.state.isCopied ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
                <p className="text-xs font-mono text-destructive break-all font-semibold pr-8">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-xs font-mono text-muted-foreground mt-2 max-h-48 overflow-y-auto custom-scrollbar whitespace-pre-wrap break-words border-t border-border/30 pt-2">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              <Button
                onClick={this.handleReload}
                size="lg"
                className="w-full sm:w-auto px-8 gap-2 font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Sayfayı Yenile
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
