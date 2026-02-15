/**
 * useCourses Hook
 *
 * Merkezi kurs verisi yönetimi.
 * TanStack Query ile cache'lenmiş kurs listesi sağlar.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Course = Database['public']['Tables']['courses']['Row'];

export const courseKeys = {
  all: ['courses'] as const,
  list: () => [...courseKeys.all, 'list'] as const,
  byId: (id: string) => [...courseKeys.all, 'byId', id] as const,
  names: () => [...courseKeys.all, 'names'] as const,
};

interface CourseWithName {
  id: string;
  name: string;
}

/**
 * Tüm kursların id ve name bilgisini döndürür.
 * Cache süresi: 5 dakika (kurs verileri nadiren değişir)
 */
export function useCourseNames() {
  return useQuery({
    queryKey: courseKeys.names(),
    queryFn: async (): Promise<CourseWithName[]> => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 dakika
    gcTime: 10 * 60 * 1000, // 10 dakika
  });
}

/**
 * Tüm kurs detaylarını döndürür.
 */
export function useCourses() {
  return useQuery({
    queryKey: courseKeys.list(),
    queryFn: async (): Promise<Course[]> => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Kurs id'sinden name'e lookup için Map döndürür.
 */
export function useCourseNameMap() {
  const { data: courses } = useCourseNames();

  return new Map(courses?.map((c) => [c.id, c.name]) || []);
}
