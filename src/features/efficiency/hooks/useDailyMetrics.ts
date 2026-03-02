import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getDailyEfficiencySummary } from '@/features/efficiency/services/efficiencyDataService';
import { getDailyStats } from '@/features/efficiency/services/activityService';
import { DailyEfficiencySummary } from '@/features/efficiency/types/efficiencyTypes';
import { useEfficiencyStore } from '@/features/efficiency/store/useEfficiencyStore';
import { logger } from '@/utils/logger';

export interface DailyMetrics {
  dailyGoalMinutes: number;
  todayVideoMinutes: number;
  todayReadingMinutes: number; // YENİ
  todayVideoCount: number;
  pagesRead: number; // YENİ
  videoTrendPercentage: number;
  trendPercentage: number;
  efficiencySummary: DailyEfficiencySummary | null;
  loading: boolean;
}

export function useDailyMetrics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    efficiencySummary: null as DailyEfficiencySummary | null,
    dailyGoalMinutes: 200,
    todayVideoMinutes: 0,
    todayReadingMinutes: 0,
    todayVideoCount: 0,
    pagesRead: 0,
    videoTrendPercentage: 0,
    trendPercentage: 0,
  });

  useEffect(() => {
    async function fetchDailyMetrics() {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [summary, daily] = await Promise.all([
          getDailyEfficiencySummary(user.id),
          getDailyStats(user.id),
        ]);

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
        logger.error('Failed to fetch daily metrics', error as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchDailyMetrics();
  }, [user?.id]);

  return {
    ...metrics,
    loading,
  };
}
