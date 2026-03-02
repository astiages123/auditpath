import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/features/courses/services/courseService';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 30 * 60 * 1000, // Categories don't change often, cache for 30 mins
  });
}
