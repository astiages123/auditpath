import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCategories } from './useCategories';
import {
  getLandingDashboardData,
  LandingCourseStats,
} from '@/features/quiz/services/quizLandingService';

export function useCourseLibraryData() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const { data: categoriesRaw, isLoading: catsLoading } = useCategories();

  const categories = useMemo(() => {
    if (!categoriesRaw) return [];
    return categoriesRaw
      .filter((cat) => cat.name !== 'ATA 584' && cat.slug !== 'ATA_584')
      .sort(
        (a, b) =>
          (a.sort_order || 0) - (b.sort_order || 0) ||
          a.name.localeCompare(b.name)
      );
  }, [categoriesRaw]);

  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['landingDashboardData', userId],
    queryFn: () =>
      userId
        ? getLandingDashboardData(userId)
        : Promise.resolve({} as Record<string, LandingCourseStats>),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    categories,
    dashboardStats: (dashboardStats || {}) as Record<
      string,
      LandingCourseStats
    >,
    loading: authLoading || catsLoading || statsLoading,
  };
}
