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

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await AnalyticsService.getDashboardData(user.id);
      if (data) {
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
      // We also look for other potential fields that might be considered "models" in charts
      // but based on analyticsLogic.ts, we usually group by provider or date.
    });
    return Array.from(models);
  }, [state.dailyProgress]);

  const cacheHitRate = useMemo(
    () => calculateCacheHitRate(state.dailyProgress),
    [state.dailyProgress]
  );

  const totalCost = useMemo(
    () => calculateTotalCostUsd(state.dailyProgress),
    [state.dailyProgress]
  );

  return {
    ...state,
    uniqueModels,
    cacheHitRate,
    totalCost,
    totalCostTry: totalCost * state.rate,
    progress,
    refresh: fetchAnalytics,
    logs: state.dailyProgress, // Mapping dailyProgress to logs for the table
    totalCostUsd: totalCost,
    totalRequests: state.dailyProgress.length,
    totalInputTokens: state.dailyProgress.reduce(
      (acc, curr) => acc + (curr.prompt_tokens || 0),
      0
    ),
    totalOutputTokens: state.dailyProgress.reduce(
      (acc, curr) => acc + (curr.completion_tokens || 0),
      0
    ),
    totalCachedTokens: state.dailyProgress.reduce(
      (acc, curr) => acc + (curr.cached_tokens || 0),
      0
    ),
    selectedModel: state.dailyProgress[0]?.provider || '',
    setSelectedModel: () => {}, // Default
    visibleCount: 10, // Default
    deferredVisibleCount: 10, // Default
    isPending: false, // Default
    hasMore: false, // Default
    dailyData: state.dailyProgress.map((d) => ({
      date: d.created_at ? new Date(d.created_at).toLocaleDateString() : '',
      cost: (d.cost_usd || 0) * state.rate,
      fullDate: d.created_at ? new Date(d.created_at).toLocaleString() : '',
    })),
    handleLoadMore: () => {}, // Default
  };
}
