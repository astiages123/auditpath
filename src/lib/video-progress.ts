"use client";

import { recordActivity } from "./streak";

// LocalStorage key prefix
const STORAGE_KEY_PREFIX = "video-progress-";

// Get storage key for course
function getStorageKey(courseId: string): string {
  return `${STORAGE_KEY_PREFIX}${courseId}`;
}

// Load progress from localStorage
function loadProgress(courseId: string): Set<number> {
  if (typeof window === "undefined") return new Set();

  try {
    const stored = localStorage.getItem(getStorageKey(courseId));
    if (!stored) return new Set();

    const data = JSON.parse(stored) as {
      completedVideos: number[];
      updatedAt: number;
    };
    return new Set(data.completedVideos);
  } catch {
    return new Set();
  }
}

// Save progress to localStorage
function saveProgress(courseId: string, completedVideos: Set<number>): void {
  if (typeof window === "undefined") return;

  const data = {
    completedVideos: Array.from(completedVideos),
    updatedAt: Date.now(),
  };

  localStorage.setItem(getStorageKey(courseId), JSON.stringify(data));
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
      recordActivity(1);
    }
  } else {
    if (progress.has(videoNumber)) {
      progress.delete(videoNumber);
      recordActivity(-1);
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
  let newlyCompletedCount = 0;
  let newlyRemovedCount = 0;

  for (const videoNumber of videoNumbers) {
    if (completed) {
      if (!progress.has(videoNumber)) {
        progress.add(videoNumber);
        newlyCompletedCount++;
      }
    } else {
      if (progress.has(videoNumber)) {
        progress.delete(videoNumber);
        newlyRemovedCount++;
      }
    }
  }

  if (newlyCompletedCount > 0) {
    recordActivity(newlyCompletedCount);
  } else if (newlyRemovedCount > 0) {
    recordActivity(-newlyRemovedCount);
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
  if (typeof window === "undefined") return;
  localStorage.removeItem(getStorageKey(courseId));
}

// Get all courses with progress
export function getAllProgressCourses(): string[] {
  if (typeof window === "undefined") return [];

  const courses: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      courses.push(key.replace(STORAGE_KEY_PREFIX, ""));
    }
  }
  return courses;
}
