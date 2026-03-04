import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getConsistencyData,
  getEfficiencyTrend,
  getFocusPowerData,
  getFocusTrend,
  getLearningLoadData,
} from '../services/statisticsDataService';

import type {
  DayActivity,
  EfficiencyTrend,
  FocusPowerPoint,
  FocusTrend,
  LearningLoad,
} from '@/features/statistics/types/statisticsTypes';

// ==========================================
// === TYPES ===
// ==========================================

export interface EfficiencyTrendsHook {
  loading: boolean;
  loadWeek: LearningLoad[];
  loadDay: LearningLoad[];
  loadMonth: LearningLoad[];
  loadAll: LearningLoad[];
  focusPowerWeek: FocusPowerPoint[];
  focusPowerMonth: FocusPowerPoint[];
  focusPowerAll: FocusPowerPoint[];
  consistencyData: DayActivity[];
  efficiencyTrend: EfficiencyTrend[];
  focusTrend: FocusTrend[];
}

// ==========================================
// === HOOK ===
// ==========================================

/**
 * Fetches all trend-related arrays required by the dashboard efficiency charts.
 * Leverages the Promise.all pattern to concurrently perform queries across the stats.
 * Includes data spanning daily mapping to six month averages.
 *
 * @returns {EfficiencyTrendsHook} Contains all trend states mapped and structured array variants
 */
export function useStatisticsTrends(): EfficiencyTrendsHook {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize with empty arrays to prevent mapping over null / Zombie states
  const [trends, setTrends] = useState<Omit<EfficiencyTrendsHook, 'loading'>>({
    loadWeek: [],
    loadDay: [],
    loadMonth: [],
    loadAll: [],
    focusPowerWeek: [],
    focusPowerMonth: [],
    focusPowerAll: [],
    consistencyData: [],
    efficiencyTrend: [],
    focusTrend: [],
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
      } catch (err) {
        if (mounted) {
          console.error('[useStatisticsTrends] Hata:', err);
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
