import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getUserStats } from '@/features/achievements/services/userStatsService';
import type { Rank } from '@/types/auth';
import { calculateStaticTotals } from '@/features/courses/logic/courseStats';
import { useCategories } from '@/features/courses/hooks/useCategories';
import type { Category } from '@/features/courses/types/courseTypes';

export interface CategoryProgress {
  completedVideos: number;
  completedHours: number;
  totalVideos: number;
  totalHours: number;
  completedReadings: number;
  completedPages: number;
  totalReadings: number;
  totalPages: number;
}

export interface StaticTotals {
  categoryStats: Record<string, CategoryProgress>;
  totalAllVideos: number;
  totalAllHours: number;
  totalAllReadings: number;
  totalAllPages: number;
}

export interface ProgressStats {
  completedVideos: number;
  totalVideos: number;
  completedHours: number;
  totalHours: number;
  completedReadings: number;
  completedPages: number;
  totalReadings: number;
  totalPages: number;
  streak: number;
  todayVideoCount?: number;
  categoryProgress: Record<
    string,
    {
      completedVideos: number;
      completedHours: number;
      totalVideos: number;
      totalHours: number;
      completedReadings: number;
      completedPages: number;
      totalReadings: number;
      totalPages: number;
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

export const defaultStats: ProgressStats = {
  completedVideos: 0,
  totalVideos: 0,
  completedHours: 0,
  totalHours: 0,
  completedReadings: 0,
  completedPages: 0,
  totalReadings: 0,
  totalPages: 0,
  streak: 0,
  categoryProgress: {},
  courseProgress: {},
};

export function useProgress() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: categories } = useCategories();

  const staticTotals = useMemo(() => {
    if (!categories) return null;
    return calculateStaticTotals(categories);
  }, [categories]);

  const {
    data: stats,
    isLoading,
    refetch,
  } = useProgressQuery(userId, staticTotals);
  const { updateProgress } = useOptimisticProgress(categories);

  const refreshProgress = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateProgressOptimistically = useCallback(
    (
      courseId: string,
      deltaVideos: number,
      deltaHours: number,
      isReading: boolean = false,
      deltaPages: number = 0
    ) => {
      if (userId) {
        updateProgress(
          userId,
          courseId,
          deltaVideos,
          deltaHours,
          isReading,
          deltaPages
        );
      }
    },
    [userId, updateProgress]
  );

  const value = useMemo(
    () => ({
      stats: stats || (defaultStats as ProgressStats),
      refreshProgress,
      isLoading: isLoading || !staticTotals,
      streak: stats?.streak || 0,
      updateProgressOptimistically,
    }),
    [
      stats,
      refreshProgress,
      isLoading,
      staticTotals,
      updateProgressOptimistically,
    ]
  );

  return value;
}

export function useProgressQuery(
  userId?: string,
  staticTotals?: StaticTotals | null,
  initialStats?: Partial<ProgressStats>
) {
  return useQuery({
    queryKey: [...progressKeys.user(userId || 'guest'), staticTotals !== null],
    queryFn: async () => {
      if (!userId || !staticTotals) return defaultStats;

      const dbStats = await getUserStats(userId);
      if (!dbStats) return defaultStats;

      // Merge Logic from Provider
      const mergedCategoryProgress = { ...staticTotals.categoryStats };

      if (dbStats.categoryProgress) {
        Object.entries(dbStats.categoryProgress).forEach(([catName, stats]) => {
          const catStats = stats as {
            completedVideos: number;
            completedHours: number;
            completedReadings?: number;
            completedPages?: number;
          };
          if (mergedCategoryProgress[catName]) {
            mergedCategoryProgress[catName] = {
              ...mergedCategoryProgress[catName],
              completedVideos: catStats.completedVideos || 0,
              completedHours: catStats.completedHours || 0,
              completedReadings: catStats.completedReadings || 0,
              completedPages: catStats.completedPages || 0,
            };
          }
        });
      }

      return {
        completedVideos: dbStats.completedVideos,
        totalVideos: staticTotals.totalAllVideos,
        completedHours: dbStats.completedHours,
        totalHours: staticTotals.totalAllHours,
        completedReadings: dbStats.completedReadings || 0,
        completedPages: dbStats.completedPages || 0,
        totalReadings: staticTotals.totalAllReadings,
        totalPages: staticTotals.totalAllPages,
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

export function useOptimisticProgress(categories?: Category[]) {
  const queryClient = useQueryClient();

  const updateProgress = (
    userId: string,
    courseId: string,
    deltaVideos: number,
    deltaHours: number,
    isReading: boolean = false,
    deltaPages: number = 0
  ) => {
    queryClient.setQueryData(
      progressKeys.user(userId),
      (old: ProgressStats | undefined) => {
        if (!old) return old;

        // Find category for the courseId.
        // In the modular structure, we can check the index if it has course-to-category mapping,
        // or check common naming conventions. For now, we'll search across categories if needed,
        // but ideally the caller should provide the categorySlug.

        // As a fallback, since we can't load all files here synchronously,
        // we'll assume the courseId often contains the category prefix or we use the index.
        const categoryData = categories?.find(
          (cat) =>
            courseId.startsWith(cat.slug.toLowerCase()) || cat.slug === courseId // simple match
        );

        if (!categoryData) return old;

        const categoryName = categoryData.slug;

        const currentCategoryProgress = old.categoryProgress as Record<
          string,
          CategoryProgress
        >;
        const existingCatStats = currentCategoryProgress[categoryName] || {
          completedVideos: 0,
          completedHours: 0,
          totalVideos: 0,
          totalHours: 0,
          completedReadings: 0,
          completedPages: 0,
          totalReadings: 0,
          totalPages: 0,
        };

        const newCategoryProgress = {
          ...old.categoryProgress,
          [categoryName]: {
            ...existingCatStats,
            completedVideos: isReading
              ? existingCatStats.completedVideos
              : existingCatStats.completedVideos + deltaVideos,
            completedHours: isReading
              ? existingCatStats.completedHours // Metinlerin saati general totals'ta değerlendiriliyor mu? Evet calculateStaticTotals'ta reading kısmında "catTotalHours += course.totalHours" yapmıştık. Burada da deltaHours ile artırabiliriz.
              : existingCatStats.completedHours + deltaHours,
            completedReadings: isReading
              ? existingCatStats.completedReadings + deltaVideos
              : existingCatStats.completedReadings,
            completedPages: isReading
              ? existingCatStats.completedPages + deltaPages
              : existingCatStats.completedPages,
          },
        };

        // Eğer reading ise, genel süreye de etki edebiliriz.
        if (isReading) {
          (newCategoryProgress as Record<string, CategoryProgress>)[
            categoryName
          ].completedHours += deltaHours;
        }

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
          completedVideos: isReading
            ? old.completedVideos
            : old.completedVideos + deltaVideos,
          completedHours: old.completedHours + deltaHours,
          completedReadings: isReading
            ? (old.completedReadings || 0) + deltaVideos
            : old.completedReadings || 0,
          completedPages: isReading
            ? (old.completedPages || 0) + deltaPages
            : old.completedPages || 0,
          streak: newStreak,
          todayVideoCount: newTodayCount,
          courseProgress: {
            ...old.courseProgress,
            [courseId]: (old.courseProgress[courseId] || 0) + deltaVideos,
          },
          categoryProgress: {
            ...newCategoryProgress,
          },
        };
      }
    );
  };

  return { updateProgress };
}
