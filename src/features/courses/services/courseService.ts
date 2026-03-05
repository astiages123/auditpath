// ===========================
// === IMPORTS ===
// ===========================

import { supabase } from '@/lib/supabase';
import type { Category, Course } from '@/features/courses/types/courseTypes';
import { getItemsByCourseId } from './videoService';

// ===========================
// === SERVICE FUNCTIONS ===
// ===========================

/**
 * Fetches all categories with their associated courses.
 */
export async function getCategories(): Promise<Category[]> {
  try {
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
          console.error('[courseService][getCategories] Hata:', catError);
        }
      }
      return [];
    }

    return categories as Category[];
  } catch (error) {
    console.error('[courseService][getCategories] Hata:', error);
    return [];
  }
}

/**
 * Fetches all courses from the database.
 */
export async function getAllCourses(): Promise<Course[]> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('[courseService][getAllCourses] Hata:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('[courseService][getAllCourses] Hata:', error);
    return [];
  }
}

/**
 * Fetches a single course by its slug.
 */
export async function getCourseBySlug(
  courseSlug: string
): Promise<Course | null> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('course_slug', courseSlug)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned"
        console.error('[courseService][getCourseBySlug] Hata:', error);
      }
      return null;
    }
    return data;
  } catch (error) {
    console.error('[courseService][getCourseBySlug] Hata:', error);
    return null;
  }
}

/**
 * Fetches items (videos or reading sections) for a given course.
 */
export async function getItemsByCourse(courseId: string) {
  try {
    return await getItemsByCourseId(courseId);
  } catch (error) {
    console.error('[courseService][getItemsByCourse] Hata:', error);
    return [];
  }
}
