import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCategories } from './useCategories';
import { getLandingLibraryStats } from '@/features/quiz/services/quizLandingService';
import type { LandingCourseStats } from '@/features/quiz/types/types';
import { updateCategoryCache } from '../logic/coursesLogic';
import type { Category } from '../types/courseTypes';

export interface CourseLibraryStats extends LandingCourseStats {
  videoProgress?: number;
}

export interface CourseLibraryDataResult {
  categories: Category[];
  dashboardStats: Record<string, CourseLibraryStats>;
  loading: boolean;
}

/**
 * Hook to retrieve and format data needed for the course library view.
 * Computes category cache relationships and fetches relevant user dashboard stats.
 *
 * @returns Resulting categories and related loading/dashboard statistics
 */
export function useCourseLibraryData(): CourseLibraryDataResult {
  const { user, loading: isAuthLoading } = useAuth();
  const userId = user?.id;

  const { data: categoriesRaw, isLoading: isCategoriesLoading } =
    useCategories();

  const categories = useMemo(() => {
    if (!categoriesRaw) return [];

    // Update logic cache for icons/themes
    categoriesRaw.forEach((category) => {
      updateCategoryCache(
        category.slug || category.name.toLowerCase().replace(/\\s+/g, '-'),
        category.courses
          .map((course) => course.course_slug)
          .filter(Boolean) as string[]
      );
    });

    return [...categoriesRaw].sort(
      (a, b) =>
        (a.sort_order || 0) - (b.sort_order || 0) ||
        a.name.localeCompare(b.name)
    );
  }, [categoriesRaw]);

  const { data: dashboardStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['landingDashboardData', userId],
    queryFn: async () => {
      if (!userId) {
        return {} as Record<string, CourseLibraryStats>;
      }

      const stats = await getLandingLibraryStats(userId);
      return (stats || {}) as Record<string, CourseLibraryStats>;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    categories: categories as Category[],
    dashboardStats: dashboardStats || {},
    loading: isAuthLoading || isCategoriesLoading || isStatsLoading,
  };
}
