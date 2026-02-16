import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Box, Brain, Zap } from 'lucide-react';

interface QuotaDisplayProps {
  displayedUsed: number;
  displayedQuota: number;
  loading: boolean;
  savedCount: number;
  progress: number;
  percentage: number;
  currentStep?: string;
  conceptCount: number;
}

export const QuotaDisplay: React.FC<QuotaDisplayProps> = ({
  displayedUsed,
  displayedQuota,
  loading,
  savedCount,
  progress,
  percentage,
  currentStep,
  conceptCount,
}) => {
  return (
    <div className="space-y-4">
      {/* Quota Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Box className="w-4 h-4 text-blue-500" />
            <span>Soru Kotası</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">
              {displayedUsed} / {displayedQuota}
            </span>
            {loading && savedCount > 0 && (
              <span className="text-xs text-green-500 font-medium bg-green-500/10 px-1.5 py-0.5 rounded animate-pulse">
                +{savedCount}
              </span>
            )}
          </div>
        </div>

        <Progress
          value={loading ? progress : percentage}
          className="h-2"
          indicatorClassName={
            loading
              ? 'bg-yellow-500 transition-all duration-500'
              : 'bg-blue-600'
          }
        />

        {loading && currentStep && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="w-3 h-3 text-yellow-500 animate-pulse" />
            <span className="font-medium">{currentStep}</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-xl bg-muted/50 p-6 flex flex-col items-center justify-center gap-2 border border-border/50">
          <Brain className="w-6 h-6 text-purple-500 mb-1" />
          <span className="text-muted-foreground text-sm font-medium">
            Tespit Edilen Kavram
          </span>
          <span className="font-mono text-foreground text-3xl font-bold tracking-tight">
            {conceptCount}
          </span>
        </div>
      </div>
    </div>
  );
};
