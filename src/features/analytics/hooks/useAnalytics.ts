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
  const [rawLogs, setRawLogs] = useState<AiGenerationCost[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('all');
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
        setRawLogs(validatedData);
      } catch (error) {
        handleSupabaseError(error, 'useAnalytics.fetchData');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const uniqueModels = useMemo(() => {
    const models = rawLogs
      .map((l) => l.model)
      .filter((m): m is string => typeof m === 'string' && m.length > 0);
    return Array.from(new Set(models)).sort();
  }, [rawLogs]);

  const filteredLogs = useMemo(() => {
    if (selectedModel === 'all') return rawLogs;
    return rawLogs.filter((l) => l.model === selectedModel);
  }, [rawLogs, selectedModel]);

  const dailyData = useMemo(
    () => processDailyData(filteredLogs, rate),
    [filteredLogs, rate]
  );
  const totalCostUsd = useMemo(
    () => calculateTotalCostUsd(filteredLogs),
    [filteredLogs]
  );
  const totalCostTry = totalCostUsd * rate;
  const totalRequests = filteredLogs.length;
  const cacheHitRate = useMemo(
    () => calculateCacheHitRate(filteredLogs),
    [filteredLogs]
  );

  const totalInputTokens = useMemo(
    () => filteredLogs.reduce((acc, log) => acc + (log.prompt_tokens || 0), 0),
    [filteredLogs]
  );

  const totalOutputTokens = useMemo(
    () =>
      filteredLogs.reduce((acc, log) => acc + (log.completion_tokens || 0), 0),
    [filteredLogs]
  );

  const totalCachedTokens = useMemo(
    () => filteredLogs.reduce((acc, log) => acc + (log.cached_tokens || 0), 0),
    [filteredLogs]
  );

  const handleLoadMore = () => {
    startTransition(() => {
      setVisibleCount((prev) => prev + 50);
    });
  };

  return {
    logs: filteredLogs,
    selectedModel,
    setSelectedModel,
    uniqueModels,
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
    totalInputTokens,
    totalOutputTokens,
    totalCachedTokens,
    handleLoadMore,
  };
}
