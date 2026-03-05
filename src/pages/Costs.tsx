import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StatsSkeleton,
  TableSkeleton,
  CardSkeleton,
} from '@/shared/components/SkeletonTemplates';

import { useCosts } from '@/features/costs/hooks/useCosts';

import { CostsHeader } from '@/features/costs/components/layout/CostsHeader';
import { CostsStats } from '@/features/costs/components/layout/CostsStats';
import { CostsTable } from '@/features/costs/components/charts/CostsTable';
import { PageHeader } from '@/shared/components/PageHeader';

const CostsChart = lazy(() =>
  import('@/features/costs/components/charts/CostsChart').then((m) => ({
    default: m.CostsChart,
  }))
);

export default function CostsPage() {
  const {
    logs,
    selectedModel,
    setSelectedModel,
    uniqueModels,
    usdTryRate,
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
  } = useCosts();

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
        title="AI Maliyetleri"
        subtitle="Model kullanım kayıtları ve oluşan maliyetleri takip et."
      />
      <div className="space-y-6">
        <CostsHeader
          usdTryRate={usdTryRate}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          availableModels={uniqueModels}
        />

        <CostsStats
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
          <CostsChart dailyData={dailyData} formatCurrency={formatCurrency} />
        </Suspense>

        <CostsTable
          logs={logs}
          formatCurrency={formatCurrency}
          hasMore={hasMore}
          isPending={isPending}
          usdTryRate={usdTryRate}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );
}
