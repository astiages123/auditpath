import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { AnalyticsService } from '../services/analyticsService';
import { ExchangeRateService } from '../services/exchangeRateService';
import {
  calculateCacheHitRate,
  calculateTotalCostUsd,
  processDailyData,
  validateLogs,
} from '../logic/analyticsLogic';
import { AiGenerationCost } from '../types/analyticsTypes';
import { handleSupabaseError } from '@/lib/supabaseHelpers';

export function useAnalytics() {
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

        const data = await AnalyticsService.fetchGenerationCosts();
        const validatedData = validateLogs(data || []);
        setLogs(validatedData);
      } catch (error) {
        handleSupabaseError(error, 'useAnalytics.fetchData');
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

  const handleLoadMore = () => {
    startTransition(() => {
      setVisibleCount((prev) => prev + 50);
    });
  };

  return {
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
  };
}
