import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StatsSkeleton,
  TableSkeleton,
  CardSkeleton,
} from '@/shared/components/SkeletonTemplates';

import { useAnalytics } from '@/features/analytics/hooks/useAnalytics';

import { AnalyticsHeader } from '@/features/analytics/components/layout/AnalyticsHeader';
import { AnalyticsStats } from '@/features/analytics/components/layout/AnalyticsStats';
import { AnalyticsTable } from '@/features/analytics/components/charts/AnalyticsTable';
import { PageHeader } from '@/shared/components/PageHeader';

// Lazy load the chart component
const AnalyticsChart = lazy(() =>
  import('@/features/analytics/components/charts/AnalyticsChart').then((m) => ({
    default: m.AnalyticsChart,
  }))
);

export default function AnalyticsPage() {
  const {
    logs,
    selectedModel,
    setSelectedModel,
    uniqueModels,
    rate,
    loading,
    isPending,
    dailyData,
    totalCostUsd,
    totalCostTry,
    totalRequests,
    cacheHitRate,
    totalInputTokens,
    totalOutputTokens,
    totalCachedTokens,
    handleLoadMore,
    hasMore,
  } = useAnalytics();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <StatsSkeleton />
        <CardSkeleton className="h-[400px]" />
        <TableSkeleton rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Maliyet Analizi"
        subtitle="AI model kullanım ve maliyet analizlerini takip et."
      />
      <div className="space-y-6">
        <AnalyticsHeader
          rate={rate}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          availableModels={uniqueModels}
        />

        <AnalyticsStats
          totalCostTry={totalCostTry}
          totalCostUsd={totalCostUsd}
          totalRequests={totalRequests}
          cacheHitRate={cacheHitRate}
          totalInputTokens={totalInputTokens}
          totalOutputTokens={totalOutputTokens}
          totalCachedTokens={totalCachedTokens}
          formatCurrency={formatCurrency}
        />

        <Suspense fallback={<CardSkeleton className="h-[400px]" />}>
          <AnalyticsChart
            dailyData={dailyData}
            formatCurrency={formatCurrency}
          />
        </Suspense>

        <AnalyticsTable
          logs={logs}
          formatCurrency={formatCurrency}
          hasMore={hasMore}
          isPending={isPending}
          rate={rate}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );
}
