import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getComprehensiveHistory,
  getDailyEfficiencySummary,
} from '../services/statisticsDataService';
import {
  buildTrendDayAggregates,
  processConsistencyDataFromAggregates,
  processEfficiencyTrendFromAggregates,
  processFocusPowerDataFromAggregates,
  processFocusTrendFromAggregates,
  processLearningLoadDataFromAggregates,
} from '../services/statisticsCoreService';
import { generateDateRange } from '../logic/statisticsHelpers';
import { performanceMonitor } from '@/utils/performance';
import { getAppDayStart } from '@/utils/dateUtils';

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
 * Leverages the Promise.allSettled pattern to concurrently perform queries across the stats.
 * Uses a single comprehensive fetch for history and processes it client-side.
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
        await performanceMonitor.measurePromise(
          'useStatisticsTrends',
          'fetchTrendsTotal',
          async () => {
            const results = await Promise.allSettled([
              getComprehensiveHistory(user.id, 180),
              getDailyEfficiencySummary(user.id),
            ]);

            const historyResult =
              results[0].status === 'fulfilled'
                ? results[0].value
                : { sessions: [], videos: [] };

            if (results[0].status === 'rejected') {
              console.error(
                '[useStatisticsTrends] History fetch failed:',
                results[0].reason
              );
            }
            if (results[1].status === 'rejected') {
              console.error(
                '[useStatisticsTrends] Daily summary fetch failed:',
                results[1].reason
              );
            }

            if (!mounted) return;

            const anchorDate = getAppDayStart();
            const { sessions, videos } = historyResult;
            const dateRange30 = generateDateRange(30);
            const trendAggregates = buildTrendDayAggregates(sessions, videos);

            setTrends({
              efficiencyTrend:
                processEfficiencyTrendFromAggregates(
                  trendAggregates,
                  dateRange30
                ) || [],
              focusTrend:
                processFocusTrendFromAggregates(trendAggregates, dateRange30) ||
                [],
              loadDay:
                processLearningLoadDataFromAggregates(
                  trendAggregates,
                  1,
                  anchorDate
                ) || [],
              loadWeek:
                processLearningLoadDataFromAggregates(
                  trendAggregates,
                  7,
                  anchorDate
                ) || [],
              loadMonth:
                processLearningLoadDataFromAggregates(
                  trendAggregates,
                  30,
                  anchorDate
                ) || [],
              loadAll:
                processLearningLoadDataFromAggregates(
                  trendAggregates,
                  180,
                  anchorDate
                ) || [],
              focusPowerWeek:
                processFocusPowerDataFromAggregates(
                  trendAggregates,
                  'week',
                  anchorDate
                ) || [],
              focusPowerMonth:
                processFocusPowerDataFromAggregates(
                  trendAggregates,
                  'month',
                  anchorDate
                ) || [],
              focusPowerAll:
                processFocusPowerDataFromAggregates(
                  trendAggregates,
                  'all',
                  anchorDate
                ) || [],
              consistencyData:
                processConsistencyDataFromAggregates(
                  trendAggregates,
                  30,
                  anchorDate
                ) || [],
            });
          }
        );
      } catch (err) {
        if (mounted) {
          console.error('[useStatisticsTrends] Beklenmedik hata:', err);
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
