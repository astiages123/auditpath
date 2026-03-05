import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { handleSupabaseError } from '@/lib/supabaseHelpers';
import { useProgress } from '@/shared/hooks/useProgress';
import { AnalyticsService } from '../services/analyticsService';
import {
  type AiGenerationCost,
  calculateCacheHitRate,
  calculateTotalCostUsd,
} from '../logic/analyticsLogic';

interface AnalyticsState {
  quizStatus: unknown;
  dailyProgress: AiGenerationCost[];
  recentActivity: unknown[];
  subjectMastery: unknown[];
  scoreTypeAnalytics: unknown[];
  loading: boolean;
  rate: number;
}

export function useAnalytics() {
  const { user } = useAuth();
  const { stats: progress } = useProgress();

  const [state, setState] = useState<AnalyticsState>({
    quizStatus: null,
    dailyProgress: [],
    recentActivity: [],
    subjectMastery: [],
    scoreTypeAnalytics: [],
    loading: true,
    rate: 34.0,
  });

  const [selectedModel, setSelectedModelState] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const [allLogs, setAllLogs] = useState<AiGenerationCost[]>([]);

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await AnalyticsService.getDashboardData(user.id);
      if (data) {
        setAllLogs(data.dailyProgress);
        setState((prev) => ({
          ...prev,
          quizStatus: data.quizStatus,
          dailyProgress: data.dailyProgress,
          recentActivity: data.recentActivity,
          subjectMastery: data.subjectMastery,
          scoreTypeAnalytics: data.scoreTypeAnalytics,
          loading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      handleSupabaseError(error, 'useAnalytics.fetchAnalytics');
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      // Defer execution to avoid synchronous setState in effect body
      const timeoutId = setTimeout(() => {
        void fetchAnalytics();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [user?.id, fetchAnalytics]);

  const uniqueModels = useMemo(() => {
    const models = new Set<string>();
    state.dailyProgress.forEach((day: AiGenerationCost) => {
      if (day.provider) models.add(day.provider);
    });
    return Array.from(models);
  }, [state.dailyProgress]);

  // Filter logs based on selected model
  const filteredLogs = useMemo(() => {
    if (selectedModel === 'all') return allLogs;
    return allLogs.filter((log) => log.provider === selectedModel);
  }, [allLogs, selectedModel]);

  // Paginated/Visible logs for the table
  const visibleLogs = useMemo(() => {
    return filteredLogs.slice(0, visibleCount);
  }, [filteredLogs, visibleCount]);

  const cacheHitRate = useMemo(
    () => calculateCacheHitRate(filteredLogs),
    [filteredLogs]
  );

  const totalCost = useMemo(
    () => calculateTotalCostUsd(filteredLogs),
    [filteredLogs]
  );

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + 10);
  }, []);

  const setSelectedModel = useCallback((model: string) => {
    setSelectedModelState(model);
    setVisibleCount(10);
  }, []);

  return {
    ...state,
    uniqueModels,
    cacheHitRate,
    totalCost,
    totalCostTry: totalCost * state.rate,
    progress,
    refresh: fetchAnalytics,
    logs: visibleLogs,
    totalCostUsd: totalCost,
    totalRequests: filteredLogs.length,
    totalInputTokens: filteredLogs.reduce(
      (acc, curr) => acc + (curr.prompt_tokens || 0),
      0
    ),
    totalOutputTokens: filteredLogs.reduce(
      (acc, curr) => acc + (curr.completion_tokens || 0),
      0
    ),
    totalCachedTokens: filteredLogs.reduce(
      (acc, curr) => acc + (curr.cached_tokens || 0),
      0
    ),
    selectedModel,
    setSelectedModel,
    visibleCount,
    deferredVisibleCount: visibleCount,
    isPending: false, // Could be linked to a fetching state if doing remote pagination
    hasMore: visibleCount < filteredLogs.length,
    dailyData: filteredLogs.map((d) => ({
      date: d.created_at ? new Date(d.created_at).toLocaleDateString() : '',
      cost: (d.cost_usd || 0) * state.rate,
      fullDate: d.created_at ? new Date(d.created_at).toLocaleString() : '',
    })),
    handleLoadMore,
  };
}
