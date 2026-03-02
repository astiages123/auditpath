import { useEffect, useMemo, useReducer } from 'react';
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

type HomeState = {
  categories: Category[];
  userStats: ProgressStats | null;
  loading: boolean;
  error: string | null;
};

type HomeAction =
  | { type: 'FETCH_START' }
  | {
      type: 'FETCH_SUCCESS';
      categories: Category[];
      userStats: ProgressStats | null;
    }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'SET_LOADING'; loading: boolean };

function homeReducer(state: HomeState, action: HomeAction): HomeState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        categories: action.categories,
        userStats: action.userStats,
        loading: false,
        error: null,
      };
    case 'FETCH_ERROR':
      return { ...state, error: action.error, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    default:
      return state;
  }
}

export function useHomeData(): HomeData {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const isLoaded = !authLoading;

  const [state, dispatch] = useReducer(homeReducer, {
    categories: [],
    userStats: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function loadData() {
      try {
        dispatch({ type: 'FETCH_START' });
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

        let finalCategories = cats;
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
          finalCategories = [...cats, otherCategory];
        }

        // Load stats if user is logged in
        let stats: ProgressStats | null = null;
        if (userId) {
          stats = await getUserStats(userId, cats);
        }

        dispatch({
          type: 'FETCH_SUCCESS',
          categories: finalCategories,
          userStats: stats,
        });
      } catch (e) {
        logger.error('[useHomeData] Failed to load data', e as Error);
        dispatch({
          type: 'FETCH_ERROR',
          error: 'Veritabanı bağlantısı kurulamadı.',
        });
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
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
      totalVideos: state.categories.reduce(
        (sum: number, cat: Category) =>
          sum +
          cat.courses.reduce((s: number, c) => s + (c.total_videos || 0), 0),
        0
      ),
      completedHours: 0,
      totalHours: Math.round(
        state.categories.reduce(
          (sum: number, cat: Category) => sum + (cat.total_hours || 0),
          0
        )
      ),
      completedReadings: 0,
      totalReadings: state.categories.reduce(
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
      totalPages: state.categories.reduce(
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
    [state.categories]
  );

  return {
    categories: state.categories,
    stats: state.userStats || defaultStats,
    loading: state.loading,
    error: state.error,
  };
}
