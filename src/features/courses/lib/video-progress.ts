import { storage } from '@/shared/lib/core/services/storage.service';

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

// Get completion stats for a course
export function getCourseStats(courseId: string, totalVideos: number) {
  const completed = loadProgress(courseId);
  return {
    completedCount: completed.size,
    totalVideos,
    percentage:
      totalVideos > 0 ? Math.round((completed.size / totalVideos) * 100) : 0,
  };
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
