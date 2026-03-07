import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getAllCourses } from '@/features/courses/services/courseService';
import type { Course } from '../types/courseTypes';

/**
 * Hook to fetch all courses from the database.
 * Caches the response for 30 minutes.
 *
 * @returns React Query result containing an array of courses
 */
export function useAllCourses(): UseQueryResult<Course[], Error> {
  return useQuery({
    queryKey: ['allCourses'],
    queryFn: getAllCourses,
    staleTime: 30 * 60 * 1000,
  });
}
