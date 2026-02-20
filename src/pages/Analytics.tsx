import { Skeleton } from '@/components/ui/skeleton';
import {
  StatsSkeleton,
  TableSkeleton,
  CardSkeleton,
} from '@/shared/components/SkeletonTemplates';

import { useAnalytics } from '@/features/analytics/hooks/useAnalytics';

import { AnalyticsHeader } from '@/features/analytics/components/AnalyticsHeader';
import { AnalyticsStats } from '@/features/analytics/components/AnalyticsStats';
import { AnalyticsChart } from '@/features/analytics/components/AnalyticsChart';
import { AnalyticsTable } from '@/features/analytics/components/AnalyticsTable';

export default function AnalyticsPage() {
  const {
    logs,
    rate,
    loading,
    visibleCount,
    deferredVisibleCount,
    isMounted,
    isPending,
    dailyData,
    totalCostUsd,
    totalCostTry,
    totalRequests,
    cacheHitRate,
    handleLoadMore,
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
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
      <AnalyticsHeader rate={rate} />

      <AnalyticsStats
        totalCostTry={totalCostTry}
        totalCostUsd={totalCostUsd}
        totalRequests={totalRequests}
        cacheHitRate={cacheHitRate}
        formatCurrency={formatCurrency}
      />

      <AnalyticsChart
        dailyData={dailyData}
        isMounted={isMounted}
        formatCurrency={formatCurrency}
      />

      <AnalyticsTable
        logs={logs}
        visibleCount={visibleCount}
        deferredVisibleCount={deferredVisibleCount}
        isPending={isPending}
        rate={rate}
        formatCurrency={formatCurrency}
        onLoadMore={handleLoadMore}
      />
    </div>
  );
}
