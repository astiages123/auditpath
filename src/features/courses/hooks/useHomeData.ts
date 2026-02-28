import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getAllCourses,
  getCategories,
} from '@/features/courses/services/courseService';
import { getUserStats } from '@/features/achievements/services/userStatsService';
import { type Category } from '@/features/courses/types/courseTypes';
import { logger } from '@/utils/logger';
import type { ProgressStats } from '@/shared/hooks/useProgress';

import { RANKS } from '@/features/achievements/utils/constants';

interface HomeData {
  categories: Category[];
  stats: ProgressStats;
  loading: boolean;
  error: string | null;
}

export function useHomeData(): HomeData {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const isLoaded = !authLoading;

  const [categories, setCategories] = useState<Category[]>([]);
  const [userStats, setUserStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load categories and all courses
        const [cats, allCourses] = await Promise.all([
          getCategories(),
          getAllCourses(),
        ]);

        // Check for uncategorized courses
        const categorizedCourseIds = new Set<string>();
        cats.forEach((c) =>
          c.courses.forEach((course) => categorizedCourseIds.add(course.id))
        );

        const uncategorized = allCourses.filter(
          (c) => !categorizedCourseIds.has(c.id)
        );

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
          setCategories([...cats, otherCategory]);
        } else {
          setCategories(cats);
        }

        // Load stats if user is logged in
        if (userId) {
          const stats = await getUserStats(userId, cats);
          if (stats) {
            setUserStats(stats);
          }
        }
      } catch (e) {
        logger.error('[useHomeData] Failed to load data', e as Error);
        setError('Veritabanı bağlantısı kurulamadı.');
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded) {
      loadData();
    }
  }, [userId, isLoaded]);

  // Default stats for non-logged-in users or loading state
  const defaultStats = useMemo<ProgressStats>(
    () => ({
      currentRank: RANKS[0],
      nextRank: RANKS[1],
      rankProgress: 0,
      completedVideos: 0,
      totalVideos: categories.reduce(
        (sum: number, cat: Category) =>
          sum +
          cat.courses.reduce((s: number, c) => s + (c.total_videos || 0), 0),
        0
      ),
      completedHours: 0,
      totalHours: Math.round(
        categories.reduce(
          (sum: number, cat: Category) => sum + (cat.total_hours || 0),
          0
        )
      ),
      progressPercentage: 0,
      estimatedDays: 0,
      categoryProgress: {},
      courseProgress: {},
      streak: 0,
    }),
    [categories]
  );

  return {
    categories,
    stats: userStats || defaultStats,
    loading,
    error,
  };
}
