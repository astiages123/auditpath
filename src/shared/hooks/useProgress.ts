import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getUserStats } from '@/features/achievements/services/userStatsService';
import type { Rank } from '@/types/auth';
import coursesData from '@/features/courses/services/courses.json';
import {
  calculateStaticTotals,
  type Category,
} from '@/features/courses/logic/courseStats';

export interface ProgressStats {
  completedVideos: number;
  totalVideos: number;
  completedHours: number;
  totalHours: number;
  streak: number;
  todayVideoCount?: number;
  categoryProgress: Record<
    string,
    {
      completedVideos: number;
      completedHours: number;
      totalVideos: number;
      totalHours: number;
    }
  >;
  courseProgress: Record<string, number>;
  currentRank?: Rank;
  nextRank?: Rank | null;
  rankProgress?: number;
  progressPercentage?: number;
  estimatedDays?: number;
  dailyAverage?: number;
}

export const progressKeys = {
  all: ['progress'] as const,
  user: (userId: string) => [...progressKeys.all, userId] as const,
};

const staticTotals = calculateStaticTotals();

export const defaultStats: ProgressStats = {
  completedVideos: 0,
  totalVideos: staticTotals.totalAllVideos,
  completedHours: 0,
  totalHours: staticTotals.totalAllHours,
  streak: 0,
  categoryProgress: staticTotals.categoryStats,
  courseProgress: {},
};

export function useProgress() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: stats, isLoading, refetch } = useProgressQuery(userId);
  const { updateProgress } = useOptimisticProgress();

  const refreshProgress = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateProgressOptimistically = useCallback(
    (courseId: string, deltaVideos: number, deltaHours: number) => {
      if (userId) {
        updateProgress(userId, courseId, deltaVideos, deltaHours);
      }
    },
    [userId, updateProgress]
  );

  const value = useMemo(
    () => ({
      stats: stats || (defaultStats as ProgressStats),
      refreshProgress,
      isLoading,
      streak: stats?.streak || 0,
      updateProgressOptimistically,
    }),
    [stats, refreshProgress, isLoading, updateProgressOptimistically]
  );

  return value;
}

export function useProgressQuery(
  userId?: string,
  initialStats?: Partial<ProgressStats>
) {
  return useQuery({
    queryKey: progressKeys.user(userId || 'guest'),
    queryFn: async () => {
      if (!userId) return defaultStats;

      const dbStats = await getUserStats(userId);
      if (!dbStats) return defaultStats;

      // Merge Logic from Provider
      const mergedCategoryProgress = { ...staticTotals.categoryStats };

      if (dbStats.categoryProgress) {
        Object.entries(dbStats.categoryProgress).forEach(([catName, stats]) => {
          const catStats = stats as {
            completedVideos: number;
            completedHours: number;
          };
          if (mergedCategoryProgress[catName]) {
            mergedCategoryProgress[catName] = {
              ...mergedCategoryProgress[catName],
              completedVideos: catStats.completedVideos || 0,
              completedHours: catStats.completedHours || 0,
            };
          }
        });
      }

      return {
        completedVideos: dbStats.completedVideos,
        totalVideos: staticTotals.totalAllVideos,
        completedHours: dbStats.completedHours,
        totalHours: staticTotals.totalAllHours,
        streak: dbStats.streak || 0,
        categoryProgress: mergedCategoryProgress,
        courseProgress: dbStats.courseProgress || {},
        currentRank: dbStats.currentRank,
        nextRank: dbStats.nextRank,
        rankProgress: dbStats.rankProgress,
        progressPercentage: dbStats.progressPercentage,
        estimatedDays: dbStats.estimatedDays,
        dailyAverage: dbStats.dailyAverage,
        todayVideoCount: dbStats.todayVideoCount || 0,
      } as ProgressStats;
    },
    enabled: !!userId,
    initialData: initialStats
      ? { ...defaultStats, ...initialStats }
      : undefined,
    staleTime: 5 * 60 * 1000, // 5 mins
  });
}

export function useOptimisticProgress() {
  const queryClient = useQueryClient();

  const updateProgress = (
    userId: string,
    courseId: string,
    deltaVideos: number,
    deltaHours: number
  ) => {
    queryClient.setQueryData(
      progressKeys.user(userId),
      (old: ProgressStats | undefined) => {
        if (!old) return old;

        const categories = coursesData as Category[];
        const categoryData = categories.find((cat) =>
          cat.courses.some((c) => c.id === courseId)
        );

        if (!categoryData) return old;

        const categoryName =
          categoryData.slug ||
          categoryData.category.split(' (')[0].split('. ')[1] ||
          categoryData.category;

        const existingCatStats = old.categoryProgress[categoryName] || {
          completedVideos: 0,
          completedHours: 0,
          totalVideos: 0,
          totalHours: 0,
        };

        const newCategoryProgress = {
          ...old.categoryProgress,
          [categoryName]: {
            ...existingCatStats,
            completedVideos: existingCatStats.completedVideos + deltaVideos,
            completedHours: existingCatStats.completedHours + deltaHours,
          },
        };

        const currentTodayCount = old.todayVideoCount || 0;
        const newTodayCount = Math.max(0, currentTodayCount + deltaVideos);

        let newStreak = old.streak;
        if (currentTodayCount === 0 && newTodayCount > 0) {
          // First activity today -> Streak + 1
          newStreak += 1;
        } else if (currentTodayCount > 0 && newTodayCount === 0) {
          // Last activity removed -> Streak - 1
          newStreak = Math.max(0, newStreak - 1);
        }

        return {
          ...old,
          completedVideos: old.completedVideos + deltaVideos,
          completedHours: old.completedHours + deltaHours,
          streak: newStreak,
          todayVideoCount: newTodayCount,
          courseProgress: {
            ...old.courseProgress,
            [courseId]: (old.courseProgress[courseId] || 0) + deltaVideos,
          },
          categoryProgress: newCategoryProgress,
        };
      }
    );
  };

  return { updateProgress };
}
