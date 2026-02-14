import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-[#1a1c1e] rounded-xl border border-rose-500/20">
          <div className="p-3 bg-rose-500/10 rounded-full">
            <AlertTriangle className="h-6 w-6 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">
              Bir sorun oluştu
            </h3>
            <p className="text-sm text-slate-400 max-w-[250px] mx-auto">
              Bu bileşen yüklenirken beklenmedik bir hata meydana geldi.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
          >
            Sayfayı Yenile
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
