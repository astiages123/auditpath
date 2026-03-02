import { supabase } from '@/lib/supabase';
import { getNextRank, getRankForPercentage } from '../utils/rankHelpers';
import { normalizeCategorySlug } from '@/features/courses/utils/categoryHelpers';
import { getVirtualDateKey } from '@/utils/dateUtils';
import type { Category } from '@/features/courses/types/courseTypes';

import { calculateStreak } from '@/features/achievements/logic/streakLogic';

/**
 * Get comprehensive user statistics including progress, streak, and rank.
 */
export async function getUserStats(
  userId: string,
  predefinedCategories?: Category[]
) {
  try {
    let cats: Category[] = predefinedCategories ?? [];

    if (!predefinedCategories) {
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*, courses(*)')
        .order('sort_order');

      if (catError) throw catError;
      cats = categories || [];
    }

    const courseToCategoryMap: Record<string, string> = {};
    const courseIdToSlugMap: Record<string, string> = {};
    const courseIdToTypeMap: Record<string, string> = {};

    cats.forEach((cat) => {
      cat.courses.forEach((course) => {
        courseToCategoryMap[course.id] = cat.name;
        courseIdToSlugMap[course.id] = course.course_slug;
        courseIdToTypeMap[course.id] = course.type || 'video';
      });
    });

    const dbTotalHours = cats.reduce(
      (sum, cat) => sum + (cat.total_hours || 0),
      0
    );

    const globalTotalHours = dbTotalHours || 280;
    const globalTotalReadings = cats.reduce(
      (sum, cat) =>
        sum +
        cat.courses.reduce(
          (s, c) => s + (c.type === 'reading' ? c.total_videos || 0 : 0),
          0
        ),
      0
    );
    const globalTotalVideos = cats.reduce(
      (sum, cat) =>
        sum +
        cat.courses.reduce(
          (s, c) => s + (c.type !== 'reading' ? c.total_videos || 0 : 0),
          0
        ),
      0
    );
    const globalTotalPages = cats.reduce(
      (sum, cat) =>
        sum + cat.courses.reduce((s, c) => s + (c.total_pages || 0), 0),
      0
    );

    const { data: progress, error: progressError } = await supabase
      .from('video_progress')
      .select('*, video:videos(duration_minutes, course_id, duration)')
      .eq('user_id', userId)
      .eq('completed', true);

    if (progressError) throw progressError;

    let completedVideos = 0;
    let completedReadings = 0;
    let completedPages = 0;
    let completedHours = 0;
    const courseProgress: Record<string, number> = {};
    const categoryProgress: Record<
      string,
      {
        completedVideos: number;
        completedHours: number;
        completedReadings: number;
        completedPages: number;
        totalVideos: number;
        totalReadings: number;
        totalPages: number;
        totalHours: number;
      }
    > = {};

    const activeDays = new Set<string>();
    let firstActivityDate: Date | null = null;

    if (progress) {
      for (const p of progress) {
        const dateStr = p.completed_at || p.updated_at;
        if (dateStr) {
          const d = new Date(dateStr);
          const formattedDate = getVirtualDateKey(d);
          activeDays.add(formattedDate);
          if (!firstActivityDate || d < firstActivityDate) {
            firstActivityDate = d;
          }
        }

        const video = p.video as {
          duration_minutes: number;
          course_id: string;
          duration: string;
        } | null;
        if (video) {
          const durationHours = video.duration_minutes / 60;
          completedHours += durationHours;
          const courseType = courseIdToTypeMap[video.course_id] || 'video';

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

          const courseSlug =
            courseIdToSlugMap[video.course_id] || video.course_id;
          courseProgress[courseSlug] = (courseProgress[courseSlug] || 0) + 1;

          const catName = courseToCategoryMap[video.course_id];
          if (catName) {
            const normalizedCatName = normalizeCategorySlug(catName);
            if (!categoryProgress[normalizedCatName]) {
              const cat = cats.find((c) => c.name === catName);
              categoryProgress[normalizedCatName] = {
                completedVideos: 0,
                completedHours: 0,
                completedReadings: 0,
                completedPages: 0,
                totalVideos:
                  cat?.courses.reduce(
                    (sum, c) =>
                      sum + (c.type !== 'reading' ? c.total_videos || 0 : 0),
                    0
                  ) || 0,
                totalReadings:
                  cat?.courses.reduce(
                    (sum, c) =>
                      sum + (c.type === 'reading' ? c.total_videos || 0 : 0),
                    0
                  ) || 0,
                totalPages:
                  cat?.courses.reduce(
                    (sum, c) => sum + (c.total_pages || 0),
                    0
                  ) || 0,
                totalHours: cat?.total_hours || 0,
              };
            }
            if (courseType === 'reading') {
              categoryProgress[normalizedCatName].completedReadings += 1;
              categoryProgress[normalizedCatName].completedPages += parsedPages;
            } else {
              categoryProgress[normalizedCatName].completedVideos += 1;
            }
            categoryProgress[normalizedCatName].completedHours += durationHours;
          }
        }
      }
    }

    const progressPercentage = Math.round(
      (completedHours / globalTotalHours) * 100
    );
    const currentRank = getRankForPercentage(progressPercentage);
    const nextRank = currentRank ? getNextRank(currentRank.id) : null;

    let rankProgress = 0;
    if (currentRank && nextRank) {
      const diff = nextRank.minPercentage - currentRank.minPercentage;
      rankProgress =
        diff > 0
          ? Math.min(
              100,
              Math.max(
                0,
                Math.round(
                  ((progressPercentage - currentRank.minPercentage) / diff) *
                    100
                )
              )
            )
          : 100;
    } else if (!currentRank) {
      rankProgress = 0;
    }

    const firstActivityKey = firstActivityDate
      ? getVirtualDateKey(firstActivityDate)
      : null;
    const streak = calculateStreak(activeDays, firstActivityKey);

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
      streak,
      categoryProgress,
      courseProgress,
      currentRank,
      nextRank,
      rankProgress,
      progressPercentage,
      estimatedDays,
      dailyAverage,
      todayVideoCount:
        progress?.filter((p) => {
          const dateStr = p.completed_at || p.updated_at;
          const video = p.video as { course_id: string };
          const courseType = courseIdToTypeMap[video?.course_id] || 'video';
          return (
            dateStr &&
            getVirtualDateKey(new Date(dateStr)) === getVirtualDateKey() &&
            courseType !== 'reading'
          );
        }).length || 0,
    };
  } catch {
    return null;
  }
}

// Re-export specialized services
export * from './courseMasteryService';
export * from './streakService';
export * from './activeDaysService';
