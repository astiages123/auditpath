import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getComprehensiveHistory,
  getDailyEfficiencySummary,
} from '../services/statisticsDataService';
import {
  processConsistencyData,
  processEfficiencyTrend,
  processFocusPowerData,
  processFocusTrend,
  processLearningLoadData,
} from '../services/statisticsCoreService';
import { generateDateRange } from '../logic/statisticsHelpers';
import { performanceMonitor } from '@/utils/performance';
import { getVirtualDayStart } from '@/utils/dateUtils';

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

            const anchorDate = getVirtualDayStart();
            const { sessions, videos } = historyResult;

            // Client-side processing (Slicing/Filtering)
            const dateRange30 = generateDateRange(30);

            setTrends({
              // Efficiency & Focus Trends (Last 30 days)
              efficiencyTrend:
                processEfficiencyTrend(sessions, videos, dateRange30) || [],
              focusTrend: processFocusTrend(sessions, dateRange30) || [],

              // Learning Load (Different intervals)
              loadDay:
                processLearningLoadData(sessions, videos, 1, anchorDate) || [],
              loadWeek:
                processLearningLoadData(sessions, videos, 7, anchorDate) || [],
              loadMonth:
                processLearningLoadData(sessions, videos, 30, anchorDate) || [],
              loadAll:
                processLearningLoadData(sessions, videos, 180, anchorDate) ||
                [],

              // Focus Power (Different scales)
              focusPowerWeek:
                processFocusPowerData(sessions, 'week', anchorDate) || [],
              focusPowerMonth:
                processFocusPowerData(sessions, 'month', anchorDate) || [],
              focusPowerAll:
                processFocusPowerData(sessions, 'all', anchorDate) || [],

              // Consistency Heatmap (30 days)
              consistencyData:
                processConsistencyData(sessions, 30, anchorDate) || [],
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
