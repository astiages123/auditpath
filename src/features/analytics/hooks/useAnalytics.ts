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
import { useAuth } from '@/features/auth/hooks/useAuth';

export function useAnalytics() {
  const { user } = useAuth();
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [state, setState] = useState({
    rawLogs: [] as AiGenerationCost[],
    rate: 0,
    loading: true,
  });
  const [visibleCount, setVisibleCount] = useState(50);

  const [isPending, startTransition] = useTransition();
  const deferredVisibleCount = useDeferredValue(visibleCount);

  useEffect(() => {
    let mounted = true;

    async function fetchAnalytics() {
      if (!user?.id) return;
      setState((prev) => ({ ...prev, loading: true }));

      try {
        // Assuming getActivityLogs and getLearningRate are defined or imported
        // For this edit, I'll use the existing AnalyticsService and ExchangeRateService
        // to match the original file's context, but adapt to the new state structure.
        const [logsData, rateData] = await Promise.all([
          AnalyticsService.fetchGenerationCosts(), // Replaced getActivityLogs
          ExchangeRateService.getUsdToTryRate(), // Replaced getLearningRate
        ]);

        if (mounted) {
          const validatedData = validateLogs(logsData || []); // Apply validation
          setState({
            rawLogs: validatedData,
            rate: rateData || 0,
            loading: false,
          });
        }
      } catch (error) {
        if (mounted) {
          // Assuming logger is defined or imported
          // console.error('Failed to fetch analytics', error); // Replaced logger.error
          handleSupabaseError(error, 'useAnalytics.fetchAnalytics'); // Using existing error handler
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    }

    fetchAnalytics();

    return () => {
      mounted = false;
    };
  }, [user?.id]); // Dependency on user.id as per instruction

  const uniqueModels = useMemo(() => {
    const models = state.rawLogs // Use state.rawLogs
      .map((l) => l.model)
      .filter((m): m is string => typeof m === 'string' && m.length > 0);
    return Array.from(new Set(models)).sort();
  }, [state.rawLogs]); // Dependency on state.rawLogs

  const filteredLogs = useMemo(() => {
    if (selectedModel === 'all') return state.rawLogs;
    return state.rawLogs.filter((l) => l.model === selectedModel);
  }, [state.rawLogs, selectedModel]);

  const dailyData = useMemo(
    () => processDailyData(filteredLogs, state.rate),
    [filteredLogs, state.rate]
  );
  const totalCostUsd = useMemo(
    () => calculateTotalCostUsd(filteredLogs),
    [filteredLogs]
  );
  const totalCostTry = totalCostUsd * state.rate;
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
    rate: state.rate,
    loading: state.loading,
    visibleCount,
    deferredVisibleCount,
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
