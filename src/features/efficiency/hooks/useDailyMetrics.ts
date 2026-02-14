import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getDailyEfficiencySummary, getDailyStats } from '@/lib/clientDb';
import { DailyEfficiencySummary } from '@/types';
import { logger } from '@/utils/logger';

export interface DailyMetrics {
  dailyGoalMinutes: number;
  todayVideoMinutes: number;
  todayVideoCount: number;
  videoTrendPercentage: number;
  trendPercentage: number;
  efficiencySummary: DailyEfficiencySummary | null;
  loading: boolean;
}

export function useDailyMetrics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Initialize with safe defaults
  const [efficiencySummary, setEfficiencySummary] =
    useState<DailyEfficiencySummary | null>(null);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(200);
  const [todayVideoMinutes, setTodayVideoMinutes] = useState(0);
  const [todayVideoCount, setTodayVideoCount] = useState(0);
  const [videoTrendPercentage, setVideoTrendPercentage] = useState(0);
  const [trendPercentage, setTrendPercentage] = useState(0);

  useEffect(() => {
    async function fetchDailyMetrics() {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [summary, daily] = await Promise.all([
          getDailyEfficiencySummary(user.id),
          getDailyStats(user.id),
        ]);

        setEfficiencySummary(summary);

        if (daily) {
          setDailyGoalMinutes(daily.goalMinutes || 200);
          setTodayVideoMinutes(daily.totalVideoMinutes || 0);
          setTodayVideoCount(daily.completedVideos || 0);
          setVideoTrendPercentage(daily.videoTrendPercentage || 0);
          setTrendPercentage(daily.trendPercentage || 0);
        }
      } catch (error) {
        logger.error('Failed to fetch daily metrics', error as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchDailyMetrics();
  }, [user?.id]);

  return {
    dailyGoalMinutes,
    todayVideoMinutes,
    todayVideoCount,
    videoTrendPercentage,
    trendPercentage,
    efficiencySummary,
    loading,
  };
}
