// ===========================
// === IMPORTS ===
// ===========================

import { BookOpen, FileText, type LucideIcon } from 'lucide-react';
import { storage } from '@/shared/services/storageService';
import {
  CATEGORY_THEMES,
  COURSE_THEME_CONFIG,
  type CourseTheme,
  ICON_OVERRIDES,
} from '../utils/coursesConfig';

// ===========================
// === TYPE DEFINITIONS ===
// ===========================

export interface CategoryIndexEntry {
  id: string;
  name: string;
  slug: string;
  total_hours: number;
  dataPath: string;
}

export interface VideoData {
  id: number;
  title: string;
  duration: string;
  durationMinutes: number;
}

export interface CourseData {
  id: string;
  name: string;
  type: string;
  course_slug?: string;
  videos: VideoData[];
  total_videos?: number;
  total_hours?: number;
  total_pages?: number;
  playlist_url?: string;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  total_hours?: number;
  courses: CourseData[];
}

export interface VideoProgressData {
  completedVideos: number[];
  updatedAt: number;
}

// ===========================
// === STATE & CACHE ===
// ===========================

/** Memory cache for category identification (courseSlug -> categorySlug) */
const categoryMapCache = new Map<string, string>();

// ===========================
// === CATEGORY & THEME LOGIC ===
// ===========================

/**
 * Finds the category associated with a given ID or slug.
 * This cache should be populated dynamically after retrieving categories.
 *
 * @param idOrSlug - Course ID or slug
 * @returns Category slug or null if not found
 */
export function getCategoryId(idOrSlug: string | null): string | null {
  if (!idOrSlug) return null;

  // 1. If it's already a category slug, return it directly
  if (CATEGORY_THEMES[idOrSlug]) return idOrSlug;

  // 2. Check the memory cache
  return categoryMapCache.get(idOrSlug) || null;
}

/**
 * Helper to populate the cache as category/course data arrives.
 *
 * @param categorySlug - Slug of the parent category
 * @param courseSlugs - Array of course slugs belonging to the category
 */
export function updateCategoryCache(
  categorySlug: string,
  courseSlugs: string[]
): void {
  courseSlugs.forEach((slug) => {
    categoryMapCache.set(slug, categorySlug);
  });
}

/**
 * Resolves the appropriate icon for a course or category.
 *
 * @param courseName - Name of the course
 * @param courseSlug - Optional slug of the course (used as primary look-up)
 * @returns Resolved LucideIcon component
 */
export function getCourseIcon(
  courseName: string | null,
  courseSlug?: string | null
): LucideIcon {
  const queryId = courseSlug || courseName;
  if (!queryId) return BookOpen;

  // 1. Check for specific icon overrides
  if (ICON_OVERRIDES[queryId]) return ICON_OVERRIDES[queryId];

  // 2. Check category icon
  const categoryId = getCategoryId(queryId);
  if (categoryId && CATEGORY_THEMES[categoryId]) {
    return CATEGORY_THEMES[categoryId].Icon;
  }

  return FileText; // Default fallback icon
}

/**
 * Resolves the visual theme based on the course or category.
 *
 * @param courseName - Name of the course
 * @param courseSlug - Optional slug of the course
 * @returns Resolved CourseTheme configuration
 */
export function getCourseTheme(
  courseName: string | null,
  courseSlug?: string | null
): CourseTheme {
  const queryId = courseSlug || courseName;
  if (!queryId) return 'primary';

  const categoryId = getCategoryId(queryId);
  if (categoryId && CATEGORY_THEMES[categoryId]) {
    return CATEGORY_THEMES[categoryId].theme;
  }

  return 'primary';
}

/**
 * Returns the CSS background class mapped for the given course/category.
 *
 * @param courseName - Name of the course
 * @param courseSlug - Optional slug of the course
 * @returns Tailwind CSS background class string
 */
export function getCourseColor(
  courseName: string | null,
  courseSlug?: string | null
): string {
  const theme = getCourseTheme(courseName, courseSlug);
  return COURSE_THEME_CONFIG[theme].bg;
}

/**
 * Returns the CSS text color class mapped for the given course/category icon.
 *
 * @param courseName - Name of the course
 * @param courseSlug - Optional slug of the course
 * @returns Tailwind CSS text class string
 */
export function getCourseIconColor(
  courseName: string | null,
  courseSlug?: string | null
): string {
  const theme = getCourseTheme(courseName, courseSlug);
  return COURSE_THEME_CONFIG[theme].text;
}

// ===========================
// === VIDEO PROGRESS LOGIC ===
// ===========================

const STORAGE_KEY_PREFIX = 'video-progress-';

/** Creates the unique local storage key for a course */
function getStorageKey(courseId: string): string {
  return `${STORAGE_KEY_PREFIX}${courseId}`;
}

/** Loads video progress for a completed course from local storage */
function loadProgress(courseId: string): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const data = storage.get<VideoProgressData>(getStorageKey(courseId));
    return data ? new Set(data.completedVideos) : new Set();
  } catch (error) {
    console.error('[coursesLogic][loadProgress] Hata:', error);
    return new Set();
  }
}

/** Saves updated video progress to local storage */
function saveProgress(courseId: string, completedVideos: Set<number>): void {
  if (typeof window === 'undefined') return;
  try {
    storage.set(getStorageKey(courseId), {
      completedVideos: Array.from(completedVideos),
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('[coursesLogic][saveProgress] Hata:', error);
  }
}

/** Retrieves the user's completed video progress for a course */
export function getVideoProgress(courseId: string): Set<number> {
  return loadProgress(courseId);
}

/** Checks if a specific video is marked as completed */
export function isVideoCompleted(
  courseId: string,
  videoNumber: number
): boolean {
  return loadProgress(courseId).has(videoNumber);
}

/**
 * Toggles a video's completed configuration
 * @deprecated Use videoService toggle logic instead.
 */
export function toggleVideoProgress(
  courseId: string,
  videoNumber: number,
  completed: boolean
): Set<number> {
  const progress = loadProgress(courseId);
  if (completed) {
    progress.add(videoNumber);
  } else {
    progress.delete(videoNumber);
  }
  saveProgress(courseId, progress);
  return progress;
}

// ===========================
// === STATISTICS LOGIC ===
// ===========================

/**
 * Calculates raw completion statistics for a course or general tracking.
 *
 * @param completedCount - Current number of completed items
 * @param totalVideos - Total items
 * @returns Object with completion data and progression percentage
 */
export function calculateCourseStats(
  completedCount: number,
  totalVideos: number
): { completedCount: number; totalVideos: number; percentage: number } {
  return {
    completedCount,
    totalVideos,
    percentage:
      totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0,
  };
}

/**
 * Calculates progress towards a given rank or goal based on given threshold bounds.
 *
 * @param current - Current completion value
 * @param min - Minimum value required for bound
 * @param next - Maximum value to complete bound
 * @returns Computed rank progress 0 to 100
 */
export function calculateRankProgress(
  current: number,
  min?: number,
  next?: number
): number {
  if (min === undefined || next === undefined) {
    return current >= 100 ? 100 : current;
  }
  const diff = next - min;
  return diff <= 0
    ? 100
    : Math.min(100, Math.max(0, Math.round(((current - min) / diff) * 100)));
}

/** Alias for calculating category progress bounded between min and next */
export const calculateCategoryProgress = calculateRankProgress;

/**
 * Calculates roughly how many days are left to reach the next progression rank.
 *
 * @param totalHours - Total course hours
 * @param completedHours - Hours completed by user
 * @param nextRankMinPercentage - Required percentage (0-100)
 * @param dailyAverage - Expected completions hours per day
 * @returns Estimated days
 */
export function calculateEstimatedDaysToNextRank(
  totalHours: number,
  completedHours: number,
  nextRankMinPercentage: number,
  dailyAverage: number
): number {
  if (totalHours <= 0 || dailyAverage <= 0) return 0;

  const currentPercentage = (completedHours / totalHours) * 100;
  if (currentPercentage >= nextRankMinPercentage) return 0;

  const remainingPercentage = nextRankMinPercentage - currentPercentage;
  const hoursNeeded = (remainingPercentage / 100) * totalHours;
  const daysNeeded = Math.ceil(hoursNeeded / dailyAverage);

  return Math.max(0, daysNeeded);
}

// ===========================
// === NAVIGATION LOGIC ===
// ===========================

/**
 * Gets the next contiguous video in the sequence relative to current ID
 *
 * @param videos - Listed video data
 * @param currentId - Specific current video ID
 * @returns Successive video identifier or null
 */
export function getNextVideo(
  videos: VideoData[],
  currentId: number
): number | null {
  if (!videos) return null;
  const idx = videos.findIndex((v) => v.id === currentId);
  return idx === -1 || idx === videos.length - 1 ? null : videos[idx + 1].id;
}

/**
 * Gets the preceding non-contiguous video
 *
 * @param videos - Listed video data
 * @param currentId - Specific current video ID
 * @returns Preceding video identifier or null
 */
export function getPreviousVideo(
  videos: VideoData[],
  currentId: number
): number | null {
  if (!videos) return null;
  const idx = videos.findIndex((v) => v.id === currentId);
  return idx <= 0 ? null : videos[idx - 1].id;
}
