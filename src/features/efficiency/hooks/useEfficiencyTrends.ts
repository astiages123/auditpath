import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getConsistencyData,
  getEfficiencyTrend,
  getFocusPowerData,
  getFocusTrend,
  getLearningLoadData,
} from '../services/efficiencyDataService';
import {
  DayActivity,
  EfficiencyTrend,
  FocusTrend,
} from '@/features/efficiency/types/efficiencyTypes';
import { FocusPowerPoint, LearningLoad } from '../types/efficiencyTypes';
import { logger } from '@/utils/logger';

export function useEfficiencyTrends() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Initialize with empty arrays (safe defaults) -> No Zombie Renders!
  const [trends, setTrends] = useState({
    loadWeek: [] as LearningLoad[],
    loadDay: [] as LearningLoad[],
    loadMonth: [] as LearningLoad[],
    loadAll: [] as LearningLoad[],
    focusPowerWeek: [] as FocusPowerPoint[],
    focusPowerMonth: [] as FocusPowerPoint[],
    focusPowerAll: [] as FocusPowerPoint[],
    consistencyData: [] as DayActivity[],
    efficiencyTrend: [] as EfficiencyTrend[],
    focusTrend: [] as FocusTrend[],
  });

  useEffect(() => {
    let mounted = true;

    async function fetchTrends() {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [
          effTrend,
          fTrend,
          loadWeekData,
          loadDayData,
          loadMonthData,
          loadAllData,
          focusPowerWeekData,
          focusPowerMonthData,
          focusPowerAllData,
          consistency,
        ] = await Promise.all([
          getEfficiencyTrend(user.id),
          getFocusTrend(user.id),
          getLearningLoadData({ userId: user.id, days: 7 }),
          getLearningLoadData({ userId: user.id, days: 1 }),
          getLearningLoadData({ userId: user.id, days: 30 }),
          getLearningLoadData({ userId: user.id, days: 180 }),
          getFocusPowerData({ userId: user.id, range: 'week' }),
          getFocusPowerData({ userId: user.id, range: 'month' }),
          getFocusPowerData({ userId: user.id, range: 'all' }),
          getConsistencyData({ userId: user.id, days: 30 }),
        ]);

        if (!mounted) return;

        setTrends({
          efficiencyTrend: effTrend || [],
          focusTrend: fTrend || [],
          loadWeek: loadWeekData || [],
          loadDay: loadDayData || [],
          loadMonth: loadMonthData || [],
          loadAll: loadAllData || [],
          focusPowerWeek: focusPowerWeekData || [],
          focusPowerMonth: focusPowerMonthData || [],
          focusPowerAll: focusPowerAllData || [],
          consistencyData: consistency || [],
        });
      } catch (error) {
        if (mounted) {
          logger.error('Failed to fetch efficiency trends', error as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchTrends();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return {
    loading,
    ...trends,
  };
}
