import { supabase } from '@/lib/supabase';
import type { Category, Course } from '@/features/courses/types/courseTypes';
import { getItemsByCourseId } from './videoService';

/**
 * Fetches all categories with their associated courses.
 */
export async function getCategories(): Promise<Category[]> {
  const { data: categories, error: categoryError } = await supabase
    .from('categories')
    .select('*, courses(*)')
    .order('sort_order');

  if (categoryError) {
    const isAbortError =
      categoryError.message?.includes('AbortError') ||
      categoryError.code === 'ABORT_ERROR';

    if (isAbortError) {
      return [];
    }

    throw categoryError;
  }

  return (categories || []) as Category[];
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
    throw error;
  }

  return data || [];
}

/**
 * Fetches a single course by its slug.
 */
export async function getCourseBySlug(
  courseSlug: string
): Promise<Course | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('course_slug', courseSlug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }

    throw error;
  }

  return data;
}

/**
 * Fetches items (videos or reading sections) for a given course.
 */
export async function getItemsByCourse(courseId: string) {
  return await getItemsByCourseId(courseId);
}
