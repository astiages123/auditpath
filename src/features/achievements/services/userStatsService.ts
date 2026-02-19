import { supabase } from '@/lib/supabase';
import { getNextRank, getRankForPercentage } from '../utils/rankHelpers';
import { normalizeCategorySlug } from '@/features/courses/utils/categoryHelpers';
import { getVirtualDateKey } from '@/utils/dateHelpers';

import { calculateStreak } from '@/features/achievements/logic/streakLogic';
import coursesData from '@/features/courses/services/courses.json';

/**
 * Get comprehensive user statistics including progress, streak, and rank.
 */
export async function getUserStats(userId: string) {
  try {
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*, courses(*)')
      .order('sort_order');

    if (catError) throw catError;
    const cats = categories || [];

    const courseToCategoryMap: Record<string, string> = {};
    const courseIdToSlugMap: Record<string, string> = {};

    cats.forEach((cat) => {
      cat.courses.forEach((course: { id: string; course_slug: string }) => {
        courseToCategoryMap[course.id] = cat.name;
        courseIdToSlugMap[course.id] = course.course_slug;
      });
    });

    // Helper for totals
    const getTotalsFromJSON = () => {
      let h = 0,
        v = 0;
      coursesData.forEach(
        (cat: {
          courses?: { totalHours?: number; totalVideos?: number }[];
        }) => {
          cat.courses?.forEach((c) => {
            h += c.totalHours || 0;
            v += c.totalVideos || 0;
          });
        }
      );
      return { h, v };
    };

    const jsonTotals = getTotalsFromJSON();
    const dbTotalHours = cats.reduce(
      (sum, cat) => sum + (cat.total_hours || 0),
      0
    );
    const dbTotalVideos = cats.reduce(
      (sum, cat) =>
        sum + cat.courses.reduce((s, c) => s + (c.total_videos || 0), 0),
      0
    );

    const globalTotalHours =
      dbTotalHours > 0 ? dbTotalHours : jsonTotals.h || 280;
    const globalTotalVideos =
      dbTotalVideos > 0 ? dbTotalVideos : jsonTotals.v || 550;

    const { data: progress, error: progressError } = await supabase
      .from('video_progress')
      .select('*, video:videos(duration_minutes, course_id)')
      .eq('user_id', userId)
      .eq('completed', true);

    if (progressError) throw progressError;

    const completedVideos = progress?.length || 0;
    let completedHours = 0;
    const courseProgress: Record<string, number> = {};
    const categoryProgress: Record<
      string,
      {
        completedVideos: number;
        completedHours: number;
        totalVideos: number;
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
        } | null;
        if (video) {
          const durationHours = video.duration_minutes / 60;
          completedHours += durationHours;
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
                totalVideos:
                  cat?.courses.reduce(
                    (sum, c) => sum + (c.total_videos || 0),
                    0
                  ) || 0,
                totalHours: cat?.total_hours || 0,
              };
            }
            categoryProgress[normalizedCatName].completedVideos += 1;
            categoryProgress[normalizedCatName].completedHours += durationHours;
          }
        }
      }
    }

    const progressPercentage = Math.round(
      (completedHours / globalTotalHours) * 100
    );
    const currentRank =
      completedVideos > 0
        ? getRankForPercentage(progressPercentage)
        : undefined;
    const nextRank = currentRank ? getNextRank(currentRank.id) : null;

    let rankProgress = 100;
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
      totalVideos: globalTotalVideos,
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
          return (
            dateStr &&
            getVirtualDateKey(new Date(dateStr)) === getVirtualDateKey()
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
