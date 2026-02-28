import React from 'react';
import { cn } from '@/utils/stringHelpers';

interface PageContainerProps {
  isLoading?: boolean;
  error?: string | Error | null;
  isEmpty?: boolean;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  children: React.ReactNode;
  className?: string; // Additional classes for the container wrapper
}

export function PageContainer({
  isLoading = false,
  error = null,
  isEmpty = false,
  loadingFallback,
  errorFallback,
  emptyFallback,
  children,
  className,
}: PageContainerProps) {
  if (isLoading) {
    return (
      <div className={cn('flex flex-col flex-1 h-full min-h-0', className)}>
        {loadingFallback || (
          <div className="flex flex-col items-center justify-center flex-1 h-full min-h-0 p-8 text-muted-foreground animate-pulse">
            Yükleniyor...
          </div>
        )}
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      <div className={cn('flex flex-col flex-1 h-full min-h-0', className)}>
        {errorFallback || (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 m-4 md:p-6 md:m-8">
            <h3 className="font-semibold text-destructive mb-2">
              Bir Hata Oluştu
            </h3>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </div>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={cn('flex flex-col flex-1 h-full min-h-0', className)}>
        {emptyFallback || (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] gap-4 text-center">
            <p className="text-muted-foreground">Veri bulunamadı.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col flex-1 h-full min-h-0 w-full', className)}
    >
      {children}
    </div>
  );
}
