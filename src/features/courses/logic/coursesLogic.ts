import { BookOpen, FileText, LucideIcon } from 'lucide-react';
import { storage } from '@/shared/services/storageService';
import {
  CATEGORY_THEMES,
  COURSE_THEME_CONFIG,
  CourseTheme,
  ICON_OVERRIDES,
} from '../utils/coursesConfig';
import coursesData from '../services/courses.json';

interface VideoData {
  id: number;
  title: string;
  duration: string;
  durationMinutes: number;
}

interface CourseData {
  id: string;
  name: string;
  type: string;
  course_slug?: string;
  videos: VideoData[];
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  courses: CourseData[];
}

const typedCoursesData = coursesData as CategoryData[];

// --- Caches for O(1) Lookup ---
const categoryMapCache = new Map<string, string>(); // courseId -> categoryId
let isCacheInitialized = false;

/**
 * Veritabanı ve JSON yapısını bir kez tarayıp hangi dersin
 * hangi kategoriye ait olduğunu hafızaya alır.
 */
function initCache() {
  if (isCacheInitialized) return;
  typedCoursesData.forEach((category) => {
    if (category.courses) {
      category.courses.forEach((course) => {
        categoryMapCache.set(course.id, category.slug);
        if (course.course_slug) {
          categoryMapCache.set(course.course_slug, category.slug);
        }
      });
    }
  });
  isCacheInitialized = true;
}

/**
 * Verilen ID veya Slug değerinin hangi kategoriye ait olduğunu bulur.
 */
export function getCategoryId(idOrSlug: string | null): string | null {
  if (!idOrSlug) return null;

  // Eğer zaten bir kategori slug'ıysa doğrudan döndür
  if (CATEGORY_THEMES[idOrSlug]) return idOrSlug;

  initCache();
  return categoryMapCache.get(idOrSlug) || null;
}

/**
 * Ders veya Kategori ikonu belirleme (Nokta atışı lookup)
 */
export function getCourseIcon(
  courseName: string | null,
  courseSlug?: string | null
): LucideIcon {
  const queryId = courseSlug || courseName;
  if (!queryId) return BookOpen;

  // 1. Özel İkon (Override) Kontrolü
  if (ICON_OVERRIDES[queryId]) return ICON_OVERRIDES[queryId];

  // 2. Kategori İkonu Kontrolü
  const categoryId = getCategoryId(queryId);
  if (categoryId && CATEGORY_THEMES[categoryId]) {
    return CATEGORY_THEMES[categoryId].Icon;
  }

  return FileText; // Hiçbir şey bulunamazsa
}

/**
 * Tema belirleme (Renk sadece Kategoriye bağlı)
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
 * Renk Sınıfı Getiricileri
 */
export function getCourseColor(
  courseName: string | null,
  courseSlug?: string | null
): string {
  const theme = getCourseTheme(courseName, courseSlug);
  return COURSE_THEME_CONFIG[theme].bg;
}

export function getCourseIconColor(
  courseName: string | null,
  courseSlug?: string | null
): string {
  const theme = getCourseTheme(courseName, courseSlug);
  return COURSE_THEME_CONFIG[theme].text;
}

// --- Video Progress & Logic (Değişmedi, stabil çalışıyor) ---
const STORAGE_KEY_PREFIX = 'video-progress-';
function getStorageKey(courseId: string): string {
  return `${STORAGE_KEY_PREFIX}${courseId}`;
}

interface VideoProgressData {
  completedVideos: number[];
  updatedAt: number;
}

function loadProgress(courseId: string): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const data = storage.get<VideoProgressData>(getStorageKey(courseId));
    return data ? new Set(data.completedVideos) : new Set();
  } catch {
    return new Set();
  }
}

function saveProgress(courseId: string, completedVideos: Set<number>): void {
  if (typeof window === 'undefined') return;
  storage.set(getStorageKey(courseId), {
    completedVideos: Array.from(completedVideos),
    updatedAt: Date.now(),
  });
}

export function getVideoProgress(courseId: string): Set<number> {
  return loadProgress(courseId);
}
export function isVideoCompleted(
  courseId: string,
  videoNumber: number
): boolean {
  return loadProgress(courseId).has(videoNumber);
}

/** @deprecated */
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

export const calculateCategoryProgress = calculateRankProgress;

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

// --- Video Navigasyon Mantığı ---
function findCourseVideos(courseId: string): Array<{ id: number }> | null {
  for (const category of typedCoursesData) {
    const course = category.courses?.find((c) => c.id === courseId);
    if (course) return course.videos;
  }
  return null;
}

export function getNextVideo(
  courseId: string,
  currentId: number
): number | null {
  const videos = findCourseVideos(courseId);
  if (!videos) return null;
  const idx = videos.findIndex((v) => v.id === currentId);
  return idx === -1 || idx === videos.length - 1 ? null : videos[idx + 1].id;
}

export function getPreviousVideo(
  courseId: string,
  currentId: number
): number | null {
  const videos = findCourseVideos(courseId);
  if (!videos) return null;
  const idx = videos.findIndex((v) => v.id === currentId);
  return idx <= 0 ? null : videos[idx - 1].id;
}
