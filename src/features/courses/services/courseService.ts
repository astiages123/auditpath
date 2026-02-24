import { supabase } from '@/lib/supabase';
import type { Category, Course } from '@/features/courses/types/courseTypes';
import { logger } from '@/utils/logger';

/**
 * Fetches all categories with their associated courses.
 */
export async function getCategories(): Promise<Category[]> {
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*, courses(*)')
    .order('sort_order');

  if (catError || !categories) {
    if (catError) {
      const isAbort =
        catError.message?.includes('AbortError') ||
        catError.code === 'ABORT_ERROR';
      if (!isAbort) {
        logger.error('Error fetching categories:', catError);
      }
    }
    return [];
  }

  return categories;
}

/**
 * Fetches all courses from the database.
 */
export async function getAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('sort_order');

  if (error) {
    logger.error('Error fetching all courses:', error);
    return [];
  }
  return data || [];
}
/**
 * Fetches a single course by its slug.
 */
export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('course_slug', slug)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned"
      logger.error('Error fetching course by slug:', error);
    }
    return null;
  }
  return data;
}
