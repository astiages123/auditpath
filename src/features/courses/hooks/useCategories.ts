// ===========================
// === IMPORTS ===
// ===========================

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getCategories } from '@/features/courses/services/courseService';
import type { Category } from '../types/courseTypes';
import { queryKeys } from '@/shared/utils/queryKeys';

// ===========================
// === HOOK ===
// ===========================

/**
 * Hook to fetch all categories from the database.
 * Caches the response for 30 minutes.
 *
 * @returns React Query result containing an array of categories
 */
export function useCategories(): UseQueryResult<Category[], Error> {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: getCategories,
    staleTime: 30 * 60 * 1000, // Categories don't change often, cache for 30 mins
  });
}
