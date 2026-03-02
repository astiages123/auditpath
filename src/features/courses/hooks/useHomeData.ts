import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getUserStats } from '@/features/achievements/services/userStatsService';
import { type Category } from '@/features/courses/types/courseTypes';
import type { ProgressStats } from '@/shared/hooks/useProgress';
import { RANKS } from '@/features/achievements/utils/constants';
import { useCategories } from './useCategories';
import { useAllCourses } from './useAllCourses';

interface HomeData {
  categories: Category[];
  stats: ProgressStats;
  loading: boolean;
  error: string | null;
}

export function useHomeData(): HomeData {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const { data: categoriesRaw, isLoading: catsLoading } = useCategories();
  const { data: allCoursesRaw, isLoading: allCoursesLoading } = useAllCourses();

  const finalCategories = useMemo(() => {
    if (!categoriesRaw || !allCoursesRaw) return [];

    const categorizedCourseIds = new Set<string>();
    categoriesRaw.forEach((c) =>
      c.courses.forEach((course) => categorizedCourseIds.add(course.id))
    );

    const uncategorized = allCoursesRaw.filter(
      (c) => !categorizedCourseIds.has(c.id)
    );

    let final = categoriesRaw;
    if (uncategorized.length > 0) {
      const otherCategory: Category = {
        id: 'uncategorized',
        name: 'Diğer Dersler',
        slug: 'diger-dersler',
        courses: uncategorized,
        total_hours: uncategorized.reduce(
          (acc, c) => acc + (c.total_hours || 0),
          0
        ),
        sort_order: 999,
        created_at: new Date().toISOString(),
      };
      final = [...categoriesRaw, otherCategory];
    }
    return final;
  }, [categoriesRaw, allCoursesRaw]);

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['userStats', userId],
    queryFn: () => getUserStats(userId!, finalCategories),
    enabled: !!userId && finalCategories.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Default stats for non-logged-in users or loading state
  const defaultStats = useMemo<ProgressStats>(
    () => ({
      currentRank: RANKS[0],
      nextRank: RANKS[1],
      rankProgress: 0,
      completedVideos: 0,
      totalVideos: finalCategories.reduce(
        (sum: number, cat: Category) =>
          sum +
          cat.courses.reduce((s: number, c) => s + (c.total_videos || 0), 0),
        0
      ),
      completedHours: 0,
      totalHours: Math.round(
        finalCategories.reduce(
          (sum: number, cat: Category) => sum + (cat.total_hours || 0),
          0
        )
      ),
      completedReadings: 0,
      totalReadings: finalCategories.reduce(
        (sum: number, cat: Category) =>
          sum +
          cat.courses.reduce(
            (s: number, c) =>
              s + (c.type === 'reading' ? c.total_videos || 0 : 0),
            0
          ),
        0
      ),
      completedPages: 0,
      totalPages: finalCategories.reduce(
        (sum: number, cat: Category) =>
          sum +
          cat.courses.reduce((s: number, c) => s + (c.total_pages || 0), 0),
        0
      ),
      progressPercentage: 0,
      estimatedDays: 0,
      categoryProgress: {},
      courseProgress: {},
      streak: 0,
    }),
    [finalCategories]
  );

  return {
    categories: finalCategories,
    stats: stats || defaultStats,
    loading: authLoading || catsLoading || allCoursesLoading || statsLoading,
    error: statsError ? 'Veritabanı bağlantısı kurulamadı.' : null,
  };
}
