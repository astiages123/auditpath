// ===========================
// === IMPORTS ===
// ===========================

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

// ===========================
// === INTERFACES & TYPES ===
// ===========================

export interface CourseWithName {
  id: string;
  name: string;
}

export type CourseWithCategory =
  Database['public']['Tables']['courses']['Row'] & {
    category: string;
    category_slug: string;
    category_sort_order: number;
  };

export const courseKeys = {
  all: ['courses'] as const,
  list: () => [...courseKeys.all, 'list'] as const,
  byId: (id: string) => [...courseKeys.all, 'byId', id] as const,
  names: () => [...courseKeys.all, 'names'] as const,
};

// ===========================
// === HOOKS ===
// ===========================

/**
 * Custom hook to get all courses with only id and name.
 * Caches for 5 minutes.
 *
 * @returns React Query result with array of CourseWithName
 */
export function useCourseNames(): UseQueryResult<CourseWithName[], Error> {
  return useQuery({
    queryKey: courseKeys.names(),
    queryFn: async (): Promise<CourseWithName[]> => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, name')
          .order('name');

        if (error) {
          console.error('[useCourses][useCourseNames] Hata:', error);
          throw error;
        }
        return data || [];
      } catch (error) {
        console.error('[useCourses][useCourseNames] Hata:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 dakika
    gcTime: 10 * 60 * 1000, // 10 dakika
  });
}

/**
 * Custom hook to fetch all course details including category correlations.
 *
 * @returns React Query result with CourseWithCategory array
 */
export function useCourses(): UseQueryResult<CourseWithCategory[], Error> {
  return useQuery({
    queryKey: courseKeys.list(),
    queryFn: async (): Promise<CourseWithCategory[]> => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*, categories(name, slug, sort_order)')
          .order('sort_order');

        if (error) {
          console.error('[useCourses][useCourses] Hata:', error);
          throw error;
        }

        return (data || []).map((item) => {
          const categories = (
            item as {
              categories: {
                name: string;
                slug: string;
                sort_order: number | null;
              } | null;
            }
          ).categories;

          return {
            ...item,
            category: categories?.name || 'Diğer',
            category_slug: categories?.slug || '',
            category_sort_order: categories?.sort_order ?? 999,
          } as CourseWithCategory;
        });
      } catch (error) {
        console.error('[useCourses][useCourses] Hata:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to retrieve a mapping of course ID to course Name.
 *
 * @returns Map<string, string> representing courseId -> courseName
 */
export function useCourseNameMap(): Map<string, string> {
  const { data: courses } = useCourseNames();
  return new Map(courses?.map((c) => [c.id, c.name]) || []);
}
