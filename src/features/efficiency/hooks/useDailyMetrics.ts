import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getDailyEfficiencySummary } from '@/features/efficiency/services/efficiencyDataService';
import { getDailyStats } from '@/features/efficiency/services/activityService';
import { useEfficiencyStore } from '@/features/efficiency/store/useEfficiencyStore';

import type { DailyEfficiencySummary } from '@/features/efficiency/types/efficiencyTypes';

// ==========================================
// === TYPES ===
// ==========================================

export interface DailyMetrics {
  dailyGoalMinutes: number;
  todayVideoMinutes: number;
  todayReadingMinutes: number;
  todayVideoCount: number;
  pagesRead: number;
  videoTrendPercentage: number;
  trendPercentage: number;
  efficiencySummary: DailyEfficiencySummary | null;
  loading: boolean;
}

// ==========================================
// === HOOK ===
// ==========================================

/**
 * Fetches and aggregates the user's daily efficiency stats.
 * Uses both activity and summary data to construct a view-ready daily metrics object.
 * Also synchronizes the fetched summary with the global efficiency Zustand store.
 *
 * @returns {DailyMetrics} Aggregated daily metrics and boolean loading state
 */
export function useDailyMetrics(): DailyMetrics {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<Omit<DailyMetrics, 'loading'>>({
    efficiencySummary: null,
    dailyGoalMinutes: 200,
    todayVideoMinutes: 0,
    todayReadingMinutes: 0,
    todayVideoCount: 0,
    pagesRead: 0,
    videoTrendPercentage: 0,
    trendPercentage: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function fetchDailyMetrics() {
      if (!user?.id) return;

      setLoading(true);
      try {
        const [summary, daily] = await Promise.all([
          getDailyEfficiencySummary(user.id),
          getDailyStats(user.id),
        ]);

        if (!mounted) return;

        // Sync with Global Efficiency Store
        useEfficiencyStore.getState().setEfficiencySummary(summary);

        setMetrics({
          efficiencySummary: summary,
          dailyGoalMinutes: daily?.goalMinutes ?? 200,
          todayVideoMinutes: daily?.totalVideoMinutes ?? 0,
          todayReadingMinutes: daily?.totalReadingMinutes ?? 0,
          todayVideoCount: daily?.completedVideos ?? 0,
          pagesRead: daily?.pagesRead ?? 0,
          videoTrendPercentage: daily?.videoTrendPercentage ?? 0,
          trendPercentage: daily?.trendPercentage ?? 0,
        });
      } catch (error) {
        console.error('[useDailyMetrics] Hata:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchDailyMetrics();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return {
    ...metrics,
    loading,
  };
}
