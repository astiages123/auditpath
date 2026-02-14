import { BookOpen, FileText, LucideIcon } from 'lucide-react';
import { storage } from '@/lib/storageService';
import {
  COURSE_KEYWORD_MAPPINGS,
  COURSE_THEME_CONFIG,
  CourseTheme,
  ICON_OVERRIDES,
} from '../services/coursesConfig'; // Fixed path
import coursesData from '../services/courses.json'; // Import data

// --- Caches for O(1) Lookup ---
// We use a simple in-memory cache for the "keyword search" results to avoid looping every render.
const themeCache = new Map<string, CourseTheme>();
const iconCache = new Map<string, LucideIcon>();

/**
 * Returns the appropriate icon for a course based on its name
 * Optimized with caching
 */
export function getCourseIcon(courseName: string | null): LucideIcon {
  if (!courseName) return BookOpen;

  const name = courseName.toLowerCase();

  if (iconCache.has(name)) {
    return iconCache.get(name)!;
  }

  // Check strict overrides first
  for (const override of ICON_OVERRIDES) {
    if (name.includes(override.keyword)) {
      iconCache.set(name, override.icon);
      return override.icon;
    }
  }

  // Check general mappings
  for (const mapping of COURSE_KEYWORD_MAPPINGS) {
    if (mapping.keywords.some((k) => name.includes(k))) {
      iconCache.set(name, mapping.icon);
      return mapping.icon;
    }
  }

  // Default
  iconCache.set(name, FileText);
  return FileText;
}

/**
 * Helper to determine theme from course name
 */
function getCourseTheme(courseName: string | null): CourseTheme {
  if (!courseName) return 'primary';
  const name = courseName.toLowerCase();

  if (themeCache.has(name)) {
    return themeCache.get(name)!;
  }

  for (const mapping of COURSE_KEYWORD_MAPPINGS) {
    if (mapping.keywords.some((k) => name.includes(k))) {
      themeCache.set(name, mapping.theme);
      return mapping.theme;
    }
  }

  themeCache.set(name, 'primary');
  return 'primary';
}

/**
 * Returns the background color class for a course based on its name
 */
export function getCourseColor(courseName: string | null): string {
  const theme = getCourseTheme(courseName);
  return COURSE_THEME_CONFIG[theme].bg;
}

/**
 * Returns the icon color class for a course based on its name
 */
export function getCourseIconColor(courseName: string | null): string {
  const theme = getCourseTheme(courseName);
  return COURSE_THEME_CONFIG[theme].text;
}

// Storage key prefix for video progress
const STORAGE_KEY_PREFIX = 'video-progress-';

// Get storage key for course
function getStorageKey(courseId: string): string {
  return `${STORAGE_KEY_PREFIX}${courseId}`;
}

// Interface for video progress data
interface VideoProgressData {
  completedVideos: number[];
  updatedAt: number;
}

// Load progress from storage
function loadProgress(courseId: string): Set<number> {
  if (typeof window === 'undefined') return new Set();

  try {
    const data = storage.get<VideoProgressData>(getStorageKey(courseId));
    if (!data) return new Set();

    return new Set(data.completedVideos);
  } catch {
    return new Set();
  }
}

// Save progress to storage
function saveProgress(courseId: string, completedVideos: Set<number>): void {
  if (typeof window === 'undefined') return;

  const data: VideoProgressData = {
    completedVideos: Array.from(completedVideos),
    updatedAt: Date.now(),
  };

  storage.set(getStorageKey(courseId), data, {
    ttl: 365 * 24 * 60 * 60 * 1000, // 1 year retention
  });
}

// Export functions for use in components
export function getVideoProgress(courseId: string): Set<number> {
  return loadProgress(courseId);
}

export function isVideoCompleted(
  courseId: string,
  videoNumber: number
): boolean {
  const progress = loadProgress(courseId);
  return progress.has(videoNumber);
}

/**
 * @deprecated Use useVideoActions hook instead
 */
export function toggleVideoProgress(
  courseId: string,
  videoNumber: number,
  completed: boolean
): Set<number> {
  const progress = loadProgress(courseId);

  if (completed) {
    if (!progress.has(videoNumber)) {
      progress.add(videoNumber);
    }
  } else {
    if (progress.has(videoNumber)) {
      progress.delete(videoNumber);
    }
  }

  saveProgress(courseId, progress);
  return progress;
}

/**
 * @deprecated Use useVideoActions hook instead
 */
export function toggleVideoProgressBatch(
  courseId: string,
  videoNumbers: number[],
  completed: boolean
): Set<number> {
  const progress = loadProgress(courseId);

  for (const videoNumber of videoNumbers) {
    if (completed) {
      if (!progress.has(videoNumber)) {
        progress.add(videoNumber);
      }
    } else {
      if (progress.has(videoNumber)) {
        progress.delete(videoNumber);
      }
    }
  }

  saveProgress(courseId, progress);
  return progress;
}

// Get all completed video numbers for a course
export function getCompletedVideoNumbers(courseId: string): number[] {
  const progress = loadProgress(courseId);
  return Array.from(progress).sort((a, b) => a - b);
}

// Pure function for course stats
export function calculateCourseStats(
  completedCount: number,
  totalVideos: number
) {
  return {
    completedCount,
    totalVideos,
    percentage:
      totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0,
  };
}

/**
 * Get completion stats for a course
 * @deprecated Use pure function calculateCourseStats where possible
 */
export function getCourseStats(courseId: string, totalVideos: number) {
  const completed = loadProgress(courseId);
  return calculateCourseStats(completed.size, totalVideos);
}

/**
 * Calculates the percentage towards the next rank.
 * @param currentPercentage Current overall progress percentage
 * @param currentRankMinPercentage Minimum percentage for current rank
 * @param nextRankMinPercentage Minimum percentage for next rank
 * @returns Progress 0-100 towards next rank
 */
export function calculateRankProgress(
  currentPercentage: number,
  currentRankMinPercentage: number | undefined,
  nextRankMinPercentage: number | undefined
): number {
  if (
    currentRankMinPercentage === undefined ||
    nextRankMinPercentage === undefined
  ) {
    if (currentPercentage >= 100) return 100;
    // Fallback if no rank info
    return currentPercentage;
  }

  const thresholdDiff = nextRankMinPercentage - currentRankMinPercentage;
  if (thresholdDiff <= 0) return 100;

  const progress = Math.round(
    ((currentPercentage - currentRankMinPercentage) / thresholdDiff) * 100
  );

  return Math.min(100, Math.max(0, progress));
}

// ALIAS for calculateCategoryProgress
export const calculateCategoryProgress = calculateRankProgress;

/**
 * Calculates estimated days to reach the next rank.
 */
export function calculateEstimatedDaysToNextRank(
  totalHours: number,
  completedHours: number,
  nextRankMinPercentage: number | undefined,
  dailyRateHours: number
): number {
  if (totalHours <= 0 || nextRankMinPercentage === undefined) return 0;

  const targetHours = (totalHours * nextRankMinPercentage) / 100;
  const hoursRemaining = Math.max(0, targetHours - completedHours);
  const rate = dailyRateHours > 0 ? dailyRateHours : 2; // Default 2 hours/day

  return Math.ceil(hoursRemaining / rate);
}

// Clear all progress for a course (for testing/reset)
export function clearCourseProgress(courseId: string): void {
  if (typeof window === 'undefined') return;
  storage.remove(getStorageKey(courseId));
}

// Get all courses with progress
export function getAllProgressCourses(): string[] {
  if (typeof window === 'undefined') return [];

  // Use storage service to get all keys with the prefix
  const allKeys = storage.keys();
  return allKeys
    .filter((key) => key.startsWith(STORAGE_KEY_PREFIX))
    .map((key) => key.replace(STORAGE_KEY_PREFIX, ''));
}

// Helper to find course videos
function findCourseVideos(courseId: string): Array<{ id: number }> | null {
  for (const category of coursesData as any[]) {
    const course = category.courses.find((c: any) => c.id === courseId);
    if (course) return course.videos;
  }
  return null;
}

export function getNextVideo(
  courseId: string,
  currentVideoId: number
): number | null {
  const videos = findCourseVideos(courseId);
  if (!videos) return null;

  const currentIndex = videos.findIndex((v) => v.id === currentVideoId);
  if (currentIndex === -1 || currentIndex === videos.length - 1) return null;

  return videos[currentIndex + 1].id;
}

export function getPreviousVideo(
  courseId: string,
  currentVideoId: number
): number | null {
  const videos = findCourseVideos(courseId);
  if (!videos) return null;

  const currentIndex = videos.findIndex((v) => v.id === currentVideoId);
  if (currentIndex <= 0) return null;

  return videos[currentIndex - 1].id;
}
