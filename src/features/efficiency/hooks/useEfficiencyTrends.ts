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
  const [loadWeek, setLoadWeek] = useState<LearningLoad[]>([]);
  const [loadDay, setLoadDay] = useState<LearningLoad[]>([]);
  const [loadMonth, setLoadMonth] = useState<LearningLoad[]>([]);
  const [loadAll, setLoadAll] = useState<LearningLoad[]>([]);

  const [focusPowerWeek, setFocusPowerWeek] = useState<FocusPowerPoint[]>([]);
  const [focusPowerMonth, setFocusPowerMonth] = useState<FocusPowerPoint[]>([]);
  const [focusPowerAll, setFocusPowerAll] = useState<FocusPowerPoint[]>([]);

  const [consistencyData, setConsistencyData] = useState<DayActivity[]>([]);
  const [efficiencyTrend, setEfficiencyTrend] = useState<EfficiencyTrend[]>([]);
  const [focusTrend, setFocusTrend] = useState<FocusTrend[]>([]);

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

        setEfficiencyTrend(effTrend || []);
        setFocusTrend(fTrend || []);
        setLoadWeek(loadWeekData || []);
        setLoadDay(loadDayData || []);
        setLoadMonth(loadMonthData || []);
        setLoadAll(loadAllData || []);
        setFocusPowerWeek(focusPowerWeekData || []);
        setFocusPowerMonth(focusPowerMonthData || []);
        setFocusPowerAll(focusPowerAllData || []);
        setConsistencyData(consistency || []);
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
    efficiencyTrend,
    focusTrend,
    loadWeek,
    loadDay,
    loadMonth,
    loadAll,
    focusPowerWeek,
    focusPowerMonth,
    focusPowerAll,
    consistencyData,
  };
}
