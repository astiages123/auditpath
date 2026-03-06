import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { handleSupabaseError } from '@/lib/supabaseHelpers';
import { getAppDayStartDaysAgo } from '@/utils/dateUtils';
import { CostsService } from '../services/costsService';
import { ExchangeRateService } from '../services/exchangeRateService';
import {
  calculateCacheHitRate,
  calculateTotalCostUsd,
  type GenerationCostLog,
  processDailyData,
} from '../logic/costsLogic';

interface CostsState {
  summaryLogs: GenerationCostLog[];
  tableLogs: GenerationCostLog[];
  loading: boolean;
  usdTryRate: number | null;
  availableModels: string[];
}

const COSTS_LOOKBACK_DAYS = 180;
const COSTS_PAGE_SIZE = 50;

export function useCosts() {
  const { user } = useAuth();
  const [state, setState] = useState<CostsState>({
    summaryLogs: [],
    tableLogs: [],
    loading: true,
    usdTryRate: null,
    availableModels: [],
  });
  const [selectedModel, setSelectedModelState] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const startDate = useMemo(
    () => getAppDayStartDaysAgo(COSTS_LOOKBACK_DAYS - 1),
    []
  );
  const selectedProvider = selectedModel === 'all' ? undefined : selectedModel;

  const fetchCosts = useCallback(async () => {
    if (!user?.id) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      const [summaryLogs, tableLogs, usdTryRate, availableModels] =
        await Promise.all([
          CostsService.fetchGenerationCostSummary({
            startDate,
            model: selectedProvider,
          }),
          CostsService.fetchGenerationCosts({
            page: 1,
            pageSize: COSTS_PAGE_SIZE,
            startDate,
            model: selectedProvider,
          }),
          ExchangeRateService.getUsdToTryRate(),
          CostsService.fetchAvailableModels(startDate),
        ]);

      setState({
        summaryLogs,
        tableLogs,
        usdTryRate,
        loading: false,
        availableModels,
      });
      setCurrentPage(1);
    } catch (error) {
      handleSupabaseError(error, 'useCosts.fetchCosts');
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [selectedProvider, startDate, user?.id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!user?.id) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      setState((prev) => ({ ...prev, loading: true }));
      void fetchCosts();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchCosts, user?.id]);

  const handleLoadMore = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    const nextPage = currentPage + 1;

    try {
      const nextLogs = await CostsService.fetchGenerationCosts({
        page: nextPage,
        pageSize: COSTS_PAGE_SIZE,
        startDate,
        model: selectedProvider,
      });

      setState((prev) => ({
        ...prev,
        tableLogs: [...prev.tableLogs, ...nextLogs],
      }));
      setCurrentPage(nextPage);
    } catch (error) {
      handleSupabaseError(error, 'useCosts.handleLoadMore');
    }
  }, [currentPage, selectedProvider, startDate, user?.id]);

  const totalCostUsd = useMemo(
    () => calculateTotalCostUsd(state.summaryLogs),
    [state.summaryLogs]
  );
  const cacheHitRate = useMemo(
    () => calculateCacheHitRate(state.summaryLogs),
    [state.summaryLogs]
  );
  const totalCostTry = useMemo(
    () => (state.usdTryRate === null ? null : totalCostUsd * state.usdTryRate),
    [totalCostUsd, state.usdTryRate]
  );
  const dailyData = useMemo(
    () =>
      state.usdTryRate === null
        ? []
        : processDailyData(state.summaryLogs, state.usdTryRate),
    [state.summaryLogs, state.usdTryRate]
  );

  const setSelectedModel = useCallback((model: string) => {
    setSelectedModelState(model);
  }, []);

  return {
    loading: state.loading,
    logs: state.tableLogs,
    refresh: fetchCosts,
    selectedModel,
    setSelectedModel,
    uniqueModels: state.availableModels,
    usdTryRate: state.usdTryRate,
    totalCostUsd,
    totalCostTry,
    cacheHitRate,
    totalRequests: state.summaryLogs.length,
    totalInputTokens: state.summaryLogs.reduce(
      (acc, curr) => acc + (curr.prompt_tokens || 0),
      0
    ),
    totalOutputTokens: state.summaryLogs.reduce(
      (acc, curr) => acc + (curr.completion_tokens || 0),
      0
    ),
    totalCachedTokens: state.summaryLogs.reduce(
      (acc, curr) => acc + (curr.cached_tokens || 0),
      0
    ),
    handleLoadMore,
    hasMore: state.tableLogs.length < state.summaryLogs.length,
    isPending: false,
    dailyData,
  };
}
