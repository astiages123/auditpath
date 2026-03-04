// ===========================
// === IMPORTS ===
// ===========================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCategories } from './useCategories';
import { getLandingLibraryStats } from '@/features/quiz/services/quizLandingService';
import type { LandingCourseStats } from '@/features/quiz/types/types';
import { updateCategoryCache } from '../logic/coursesLogic';
import type { Category } from '../types/courseTypes';

// ===========================
// === INTERFACES ===
// ===========================

export interface CourseLibraryStats extends LandingCourseStats {
  videoProgress?: number;
}

export interface CourseLibraryDataResult {
  categories: Category[];
  dashboardStats: Record<string, CourseLibraryStats>;
  loading: boolean;
}

// ===========================
// === HOOK ===
// ===========================

/**
 * Hook to retrieve and format data needed for the course library view.
 * Computes category cache relationships and fetches relevant user dashboard stats.
 *
 * @returns Resulting categories and related loading/dashboard statistics
 */
export function useCourseLibraryData(): CourseLibraryDataResult {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const { data: categoriesRaw, isLoading: catsLoading } = useCategories();

  const categories = useMemo(() => {
    if (!categoriesRaw) return [];

    // Update logic cache for icons/themes
    categoriesRaw.forEach((cat) => {
      updateCategoryCache(
        cat.slug || cat.name.toLowerCase().replace(/\\s+/g, '-'),
        cat.courses.map((c) => c.course_slug).filter(Boolean) as string[]
      );
    });

    return [...categoriesRaw].sort(
      (a, b) =>
        (a.sort_order || 0) - (b.sort_order || 0) ||
        a.name.localeCompare(b.name)
    );
  }, [categoriesRaw]);

  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
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
    loading: authLoading || catsLoading || statsLoading,
  };
}
