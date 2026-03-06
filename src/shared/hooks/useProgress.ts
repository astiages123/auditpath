import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getUserStats } from '@/features/achievements/services/userStatsService';
import type { Rank } from '@/types/auth';
import { calculateStaticTotals } from '@/features/courses/logic/courseStats';
import { useCategories } from '@/features/courses/hooks/useCategories';

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
  todayVideoCount: number;
  categoryProgress: Record<string, CategoryProgress>;
  courseProgress: Record<string, number>;
  currentRank?: Rank;
  nextRank?: Rank | null;
  rankProgress?: number;
  progressPercentage?: number;
  estimatedDays?: number;
  dailyAverage?: number;
}

const progressKeys = {
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
  todayVideoCount: 0,
  categoryProgress: {},
  courseProgress: {},
};

export function useProgress() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: categories } = useCategories();
  const courseCategorySlugMap = useMemo(() => {
    const categorySlugMap: Record<string, string> = {};

    categories?.forEach((category) => {
      category.courses.forEach((course) => {
        categorySlugMap[course.course_slug] = category.slug;
        categorySlugMap[course.id] = category.slug;
      });
    });

    return categorySlugMap;
  }, [categories]);

  const staticTotals = useMemo(() => {
    if (!categories) return null;
    return calculateStaticTotals(categories);
  }, [categories]);

  const {
    data: stats,
    isLoading,
    refetch,
  } = useProgressQuery(userId, staticTotals);
  const { updateProgress } = useOptimisticProgress(courseCategorySlugMap);

  const refreshProgress = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateProgressOptimistically = useCallback(
    (
      courseSlug: string,
      deltaVideos: number,
      deltaHours: number,
      isReading: boolean = false,
      deltaPages: number = 0
    ) => {
      if (userId) {
        updateProgress(
          userId,
          courseSlug,
          deltaVideos,
          deltaHours,
          isReading,
          deltaPages
        );
      }
    },
    [userId, updateProgress]
  );

  return useMemo(
    () => ({
      stats: stats || defaultStats,
      refreshProgress,
      isLoading: isLoading || !staticTotals,
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
}

export function useProgressQuery(
  userId?: string,
  staticTotals?: StaticTotals | null,
  initialStats?: Partial<ProgressStats>
) {
  return useQuery({
    queryKey: [...progressKeys.user(userId || 'guest'), staticTotals !== null],
    queryFn: async (): Promise<ProgressStats> => {
      if (!userId || !staticTotals) return defaultStats;

      const dbStats = await getUserStats(userId);
      if (!dbStats) return defaultStats;

      const mergedCategoryProgress: Record<string, CategoryProgress> = {
        ...staticTotals.categoryStats,
      };

      if (dbStats.categoryProgress) {
        Object.entries(dbStats.categoryProgress).forEach(
          ([categoryName, categoryStats]) => {
            const typedCategoryStats = categoryStats as {
              completedVideos: number;
              completedHours: number;
              completedReadings?: number;
              completedPages?: number;
            };
            if (!mergedCategoryProgress[categoryName]) return;

            mergedCategoryProgress[categoryName] = {
              ...mergedCategoryProgress[categoryName],
              completedVideos: typedCategoryStats.completedVideos || 0,
              completedHours: typedCategoryStats.completedHours || 0,
              completedReadings: typedCategoryStats.completedReadings || 0,
              completedPages: typedCategoryStats.completedPages || 0,
            };
          }
        );
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
        categoryProgress: mergedCategoryProgress,
        courseProgress: dbStats.courseProgress || {},
        currentRank: dbStats.currentRank,
        nextRank: dbStats.nextRank,
        rankProgress: dbStats.rankProgress,
        progressPercentage: dbStats.progressPercentage,
        estimatedDays: dbStats.estimatedDays,
        dailyAverage: dbStats.dailyAverage,
        todayVideoCount: dbStats.todayVideoCount || 0,
      };
    },
    enabled: !!userId,
    initialData: initialStats
      ? ({ ...defaultStats, ...initialStats } as ProgressStats)
      : undefined,
    staleTime: 5 * 60 * 1000, // 5 mins
  });
}

export function useOptimisticProgress(
  courseCategorySlugMap: Record<string, string>
) {
  const queryClient = useQueryClient();

  const updateProgress = (
    userId: string,
    courseSlug: string,
    deltaVideos: number,
    deltaHours: number,
    isReading: boolean = false,
    deltaPages: number = 0
  ) => {
    queryClient.setQueryData<ProgressStats>(
      [...progressKeys.user(userId), true],
      (old) => {
        if (!old) return old;

        const categorySlug = courseCategorySlugMap[courseSlug];
        if (!categorySlug) return old;

        const existingCategoryStats = old.categoryProgress[categorySlug] || {
          completedVideos: 0,
          completedHours: 0,
          totalVideos: 0,
          totalHours: 0,
          completedReadings: 0,
          completedPages: 0,
          totalReadings: 0,
          totalPages: 0,
        };

        const updatedCategoryStats = {
          ...existingCategoryStats,
          completedVideos: isReading
            ? existingCategoryStats.completedVideos
            : existingCategoryStats.completedVideos + deltaVideos,
          completedHours: isReading
            ? existingCategoryStats.completedHours
            : existingCategoryStats.completedHours + deltaHours,
          completedReadings: isReading
            ? existingCategoryStats.completedReadings + deltaVideos
            : existingCategoryStats.completedReadings,
          completedPages: isReading
            ? existingCategoryStats.completedPages + deltaPages
            : existingCategoryStats.completedPages,
        };

        if (isReading) {
          updatedCategoryStats.completedHours += deltaHours;
        }

        const newCategoryProgress = {
          ...old.categoryProgress,
          [categorySlug]: updatedCategoryStats,
        };

        const currentTodayCount = old.todayVideoCount || 0;
        const newTodayCount = Math.max(0, currentTodayCount + deltaVideos);

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
          todayVideoCount: newTodayCount,
          courseProgress: {
            ...old.courseProgress,
            [courseSlug]: (old.courseProgress[courseSlug] || 0) + deltaVideos,
          },
          categoryProgress: newCategoryProgress,
        };
      }
    );
  };

  return { updateProgress };
}
