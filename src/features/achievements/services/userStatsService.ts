import { supabase } from '@/lib/supabase';
import { getNextRank, getRankForPercentage } from '../utils/rankHelpers';
import { normalizeCategorySlug } from '@/features/courses/utils/categoryHelpers';
import { getVirtualDateKey } from '@/utils/dateUtils';
import type { Category } from '@/features/courses/types/courseTypes';

type CategoryProgressItem = {
  completedVideos: number;
  completedHours: number;
  completedReadings: number;
  completedPages: number;
  totalVideos: number;
  totalReadings: number;
  totalPages: number;
  totalHours: number;
};

type VideoProgressPayload = {
  duration_minutes: number | null;
  course_id: string | null;
  duration: string;
};

type ProgressItem = {
  completed_at?: string | null;
  updated_at?: string | null;
  video: VideoProgressPayload | null;
};

export interface UserProgressData {
  completedVideos: number;
  completedReadings: number;
  completedPages: number;
  totalVideos: number;
  totalReadings: number;
  totalPages: number;
  completedHours: number;
  totalHours: number;
  categoryProgress: Record<string, CategoryProgressItem>;
  courseProgress: Record<string, number>;
  currentRank: ReturnType<typeof getRankForPercentage>;
  nextRank: ReturnType<typeof getNextRank> | null;
  rankProgress: number;
  progressPercentage: number;
  estimatedDays: number;
  dailyAverage: number;
  todayVideoCount: number;
}

/**
 * Get comprehensive user statistics including progress and rank.
 *
 * @param userId - The UUID of the user
 * @param predefinedCategories - Optional pre-fetched categories array
 * @returns User progress statistics or null on failure
 */
export async function getUserStats(
  userId: string,
  predefinedCategories?: Category[]
): Promise<UserProgressData | null> {
  let categories: Category[] = predefinedCategories ?? [];
  let progressPromise;
  let progressData: ProgressItem[] | null = null;

  if (!predefinedCategories) {
    const categoriesPromise = supabase
      .from('categories')
      .select(
        'id, name, sort_order, total_hours, courses(id, name, course_slug, total_videos, total_pages, total_hours, type, sort_order)'
      )
      .order('sort_order');

    progressPromise = supabase
      .from('video_progress')
      .select('*, video:videos(duration_minutes, course_id, duration)')
      .eq('user_id', userId)
      .eq('completed', true);

    const [categoryResult, progressResult] = await Promise.all([
      categoriesPromise,
      progressPromise,
    ]);

    if (categoryResult.error) throw categoryResult.error;
    if (progressResult.error) throw progressResult.error;

    categories = (categoryResult.data as Category[]) || [];
    progressData = progressResult.data;
  } else {
    const progressResult = await supabase
      .from('video_progress')
      .select('*, video:videos(duration_minutes, course_id, duration)')
      .eq('user_id', userId)
      .eq('completed', true);

    if (progressResult.error) throw progressResult.error;
    progressData = progressResult.data;
  }

  const progress = progressData;

  const courseToCategoryMap: Record<string, string> = {};
  const courseIdToSlugMap: Record<string, string> = {};
  const courseIdToTypeMap: Record<string, string> = {};

  categories.forEach((category) => {
    category.courses.forEach((course) => {
      courseToCategoryMap[course.id] = category.name;
      courseIdToSlugMap[course.id] = course.course_slug;
      courseIdToTypeMap[course.id] = course.type || 'video';
    });
  });

  const dbTotalHours = categories.reduce(
    (sum, category) => sum + (category.total_hours || 0),
    0
  );

  const globalTotalHours = dbTotalHours || 280;
  const globalTotalReadings = categories.reduce(
    (sum, category) =>
      sum +
      category.courses.reduce(
        (courseSum, course) =>
          courseSum +
          (course.type === 'reading' ? course.total_videos || 0 : 0),
        0
      ),
    0
  );
  const globalTotalVideos = categories.reduce(
    (sum, category) =>
      sum +
      category.courses.reduce(
        (courseSum, course) =>
          courseSum +
          (course.type !== 'reading' ? course.total_videos || 0 : 0),
        0
      ),
    0
  );
  const globalTotalPages = categories.reduce(
    (sum, category) =>
      sum +
      category.courses.reduce(
        (courseSum, course) => courseSum + (course.total_pages || 0),
        0
      ),
    0
  );

  let completedVideos = 0;
  let completedReadings = 0;
  let completedPages = 0;
  let completedHours = 0;
  const courseProgress: Record<string, number> = {};
  const categoryProgress: Record<string, CategoryProgressItem> = {};

  const activeDays = new Set<string>();
  let firstActivityDate: Date | null = null;

  if (progress) {
    for (const progressItem of progress) {
      const dateString = progressItem.completed_at || progressItem.updated_at;
      if (dateString) {
        const completedAt = new Date(dateString);
        const formattedDate = getVirtualDateKey(completedAt);
        activeDays.add(formattedDate);
        if (!firstActivityDate || completedAt < firstActivityDate) {
          firstActivityDate = completedAt;
        }
      }

      const video = progressItem.video as VideoProgressPayload | null;
      if (!video) {
        continue;
      }

      const durationHours = (video.duration_minutes || 0) / 60;
      completedHours += durationHours;
      const courseType =
        (video.course_id ? courseIdToTypeMap[video.course_id] : null) ||
        'video';

      let parsedPages = 0;
      if (courseType === 'reading') {
        completedReadings += 1;
        if (video.duration) {
          const pagesMatch = video.duration.match(/\d+/);
          if (pagesMatch) {
            parsedPages = parseInt(pagesMatch[0], 10);
            completedPages += parsedPages;
          }
        }
      } else {
        completedVideos += 1;
      }

      const courseSlug = video.course_id
        ? courseIdToSlugMap[video.course_id] || video.course_id
        : 'unknown';
      courseProgress[courseSlug] = (courseProgress[courseSlug] || 0) + 1;

      const categoryName = video.course_id
        ? courseToCategoryMap[video.course_id]
        : null;
      if (!categoryName) {
        continue;
      }

      const normalizedCategoryName = normalizeCategorySlug(categoryName);
      if (!categoryProgress[normalizedCategoryName]) {
        const category = categories.find(
          (categoryItem) => categoryItem.name === categoryName
        );
        categoryProgress[normalizedCategoryName] = {
          completedVideos: 0,
          completedHours: 0,
          completedReadings: 0,
          completedPages: 0,
          totalVideos:
            category?.courses.reduce(
              (sum, course) =>
                sum +
                (course.type !== 'reading' ? course.total_videos || 0 : 0),
              0
            ) || 0,
          totalReadings:
            category?.courses.reduce(
              (sum, course) =>
                sum +
                (course.type === 'reading' ? course.total_videos || 0 : 0),
              0
            ) || 0,
          totalPages:
            category?.courses.reduce(
              (sum, course) => sum + (course.total_pages || 0),
              0
            ) || 0,
          totalHours: category?.total_hours || 0,
        };
      }

      if (courseType === 'reading') {
        categoryProgress[normalizedCategoryName].completedReadings += 1;
        categoryProgress[normalizedCategoryName].completedPages += parsedPages;
      } else {
        categoryProgress[normalizedCategoryName].completedVideos += 1;
      }

      categoryProgress[normalizedCategoryName].completedHours += durationHours;
    }
  }

  const progressPercentage = Math.round(
    (completedHours / globalTotalHours) * 100
  );
  const currentRank = getRankForPercentage(progressPercentage);
  const nextRank = currentRank ? getNextRank(currentRank.id) : null;

  let rankProgress = 0;
  if (currentRank && nextRank) {
    const percentageDiff = nextRank.minPercentage - currentRank.minPercentage;
    rankProgress =
      percentageDiff > 0
        ? Math.min(
            100,
            Math.max(
              0,
              Math.round(
                ((progressPercentage - currentRank.minPercentage) /
                  percentageDiff) *
                  100
              )
            )
          )
        : 100;
  }

  const hoursRemaining = Math.max(0, globalTotalHours - completedHours);
  const dailyAverage =
    activeDays.size > 0 ? completedHours / activeDays.size : 0;
  const estimatedDays =
    hoursRemaining > 0
      ? dailyAverage > 0
        ? Math.ceil(hoursRemaining / dailyAverage)
        : Math.ceil(hoursRemaining / 2)
      : 0;

  return {
    completedVideos,
    completedReadings,
    completedPages,
    totalVideos: globalTotalVideos,
    totalReadings: globalTotalReadings,
    totalPages: globalTotalPages,
    completedHours: Math.round(completedHours * 10) / 10,
    totalHours: globalTotalHours,
    categoryProgress,
    courseProgress,
    currentRank,
    nextRank,
    rankProgress,
    progressPercentage,
    estimatedDays,
    dailyAverage,
    todayVideoCount:
      progress?.filter((progressItem) => {
        const dateString = progressItem.completed_at || progressItem.updated_at;
        const video = progressItem.video as { course_id: string };
        const courseType = courseIdToTypeMap[video?.course_id] || 'video';

        return (
          dateString &&
          getVirtualDateKey(new Date(dateString)) === getVirtualDateKey() &&
          courseType !== 'reading'
        );
      }).length || 0,
  };
}

export * from './courseMasteryService';
export * from './activeDaysService';
