import { useQuery } from '@tanstack/react-query';
import { getAllCourses } from '@/features/courses/services/courseService';

export function useAllCourses() {
  return useQuery({
    queryKey: ['allCourses'],
    queryFn: getAllCourses,
    staleTime: 30 * 60 * 1000,
  });
}
