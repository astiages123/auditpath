import React, {
  useEffect,
  useState,
  useTransition,
  useDeferredValue,
  useMemo,
} from 'react';
import { supabase } from '@/lib/supabase';
import { ExchangeRateService } from '@/features/analytics/services/exchangeRateService';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StatsSkeleton,
  TableSkeleton,
  CardSkeleton,
} from '@/shared/components/SkeletonTemplates';

import {
  processDailyData,
  calculateTotalCostUsd,
  calculateCacheHitRate,
  validateLogs,
  type AiGenerationCost,
} from '@/features/analytics/logic/analyticsLogic';
import { handleSupabaseError } from '@/lib/supabaseHelpers';

import { AnalyticsHeader } from '@/features/analytics/components/AnalyticsHeader';
import { AnalyticsStats } from '@/features/analytics/components/AnalyticsStats';
import { AnalyticsChart } from '@/features/analytics/components/AnalyticsChart';
import { AnalyticsTable } from '@/features/analytics/components/AnalyticsTable';

export default function AnalyticsPage() {
  const [logs, setLogs] = useState<AiGenerationCost[]>([]);
  const [rate, setRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [isMounted, setIsMounted] = useState(false);

  const [isPending, startTransition] = useTransition();
  const deferredVisibleCount = useDeferredValue(visibleCount);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const tryRate = await ExchangeRateService.getUsdToTryRate();
        setRate(tryRate);

        const { data, error } = await supabase
          .from('ai_generation_costs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10000);

        if (error) throw error;

        const validatedData = validateLogs(data || []);
        setLogs(validatedData);
      } catch (error) {
        handleSupabaseError(error, 'AnalyticsPage.fetchData');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const dailyData = useMemo(() => processDailyData(logs, rate), [logs, rate]);
  const totalCostUsd = useMemo(() => calculateTotalCostUsd(logs), [logs]);
  const totalCostTry = totalCostUsd * rate;
  const totalRequests = logs.length;
  const cacheHitRate = useMemo(() => calculateCacheHitRate(logs), [logs]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleLoadMore = () => {
    startTransition(() => {
      setVisibleCount((prev) => prev + 50);
    });
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
