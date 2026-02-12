import { supabase } from '@/shared/lib/core/supabase';

import { getVirtualDateKey } from '@/shared/lib/utils/date-utils';
import {
  calculateStreak,
  calculateStreakMilestones,
} from '@/shared/lib/core/utils/streak-utils';
import {
  getNextRank,
  getRankForPercentage,
} from '@/shared/lib/core/utils/rank-utils';
import type { Rank } from '@/shared/lib/core/utils/rank-utils';
import { normalizeCategorySlug } from '@/shared/lib/core/utils/category-utils';
import coursesData from '@/features/courses/data/courses.json';
import type {
  CourseMastery,
  StreakMilestones,
} from '@/shared/types/efficiency';

/**
 * Get comprehensive user statistics including progress, streak, and rank.
 *
 * @param userId User ID
 * @returns User statistics or null on error
 */
export async function getUserStats(userId: string) {
  try {
    // Get categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*, courses(*)')
      .order('sort_order');

    if (catError) {
      throw catError;
    }

    const cats = categories || [];

    const courseToCategoryMap: Record<string, string> = {};
    const courseIdToSlugMap: Record<string, string> = {};

    cats.forEach((cat) => {
      cat.courses.forEach((course) => {
        courseToCategoryMap[course.id] = cat.name;
        courseIdToSlugMap[course.id] = course.course_slug;
      });
    });

    // Use static data for totals to ensure consistency even if categories table is transiently empty or partial
    const totalHoursFromJSON = coursesData.reduce(
      (sum: number, cat: { courses?: { totalHours?: number }[] }) =>
        sum +
        (cat.courses?.reduce(
          (s: number, c: { totalHours?: number }) => s + (c.totalHours || 0),
          0
        ) || 0),
      0
    );
    const totalVideosFromJSON = coursesData.reduce(
      (sum: number, cat: { courses?: { totalVideos?: number }[] }) =>
        sum +
        (cat.courses?.reduce(
          (s: number, c: { totalVideos?: number }) => s + (c.totalVideos || 0),
          0
        ) || 0),
      0
    );

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
      dbTotalHours > 0 ? dbTotalHours : totalHoursFromJSON || 280;
    const globalTotalVideos =
      dbTotalVideos > 0 ? dbTotalVideos : totalVideosFromJSON || 550;

    const { data: progress, error: progressError } = await supabase
      .from('video_progress')
      .select('*, video:videos(duration_minutes, course_id)')
      .eq('user_id', userId)
      .eq('completed', true);

    if (progressError) {
      throw progressError;
    }

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

    // --- Dynamic Logic Implementation ---

    // 1. Collect Active Days
    const activeDays = new Set<string>();
    let firstActivityDate: Date | null = null;

    if (progress) {
      for (const p of progress) {
        const dateStr = p.completed_at || p.updated_at;
        if (dateStr) {
          const d = new Date(dateStr);
          const formattedDate = getVirtualDateKey(d);

          activeDays.add(formattedDate);

          const rawDate = new Date(dateStr);
          if (!firstActivityDate || rawDate < firstActivityDate) {
            firstActivityDate = rawDate;
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

    // Calculate progress percentage based on HOURS instead of counts
    const progressPercentage = Math.round(
      (completedHours / globalTotalHours) * 100
    );

    let currentRank: Rank | undefined;
    let nextRank: Rank | null;
    let rankProgress = 0;

    if (completedVideos > 0) {
      currentRank = getRankForPercentage(progressPercentage);
      nextRank = getNextRank(currentRank.id);

      // Calculate rank progress
      if (nextRank) {
        const minP = currentRank.minPercentage;
        const nextMinP = nextRank.minPercentage;
        const diff = nextMinP - minP;
        rankProgress =
          diff > 0
            ? Math.min(
                100,
                Math.max(
                  0,
                  Math.round(((progressPercentage - minP) / diff) * 100)
                )
              )
            : 100;
      } else {
        // Max rank
        rankProgress = 100;
      }
    } else {
      // No videos completed yet -> No active rank
      currentRank = undefined;
      nextRank = null;
      rankProgress = 0;
    }

    // 2. Calculate Streak using utility function
    const firstActivityKey = firstActivityDate
      ? getVirtualDateKey(firstActivityDate)
      : null;

    const streak = calculateStreak(activeDays, firstActivityKey);

    // 3. Estimate Days Remaining
    let estimatedDays = 0;
    const totalHours = globalTotalHours;
    const hoursRemaining = Math.max(0, totalHours - completedHours);

    if (hoursRemaining > 0) {
      if (activeDays.size > 0 && completedHours > 0) {
        const dailyAveragePerActiveDay = completedHours / activeDays.size;

        if (dailyAveragePerActiveDay > 0) {
          estimatedDays = Math.ceil(hoursRemaining / dailyAveragePerActiveDay);
        } else {
          estimatedDays = 999;
        }
      } else {
        estimatedDays = Math.ceil(hoursRemaining / 2);
      }
    } else {
      estimatedDays = 0;
    }

    const dailyAverage =
      activeDays.size > 0 ? completedHours / activeDays.size : 0;

    return {
      completedVideos,
      totalVideos: globalTotalVideos,
      completedHours: Math.round(completedHours * 10) / 10,
      totalHours,
      streak,
      categoryProgress,
      courseProgress,
      currentRank,
      nextRank,
      rankProgress,
      progressPercentage,
      estimatedDays,
      dailyAverage,
      todayVideoCount: (() => {
        const checkTodayStr = getVirtualDateKey();

        if (!progress) {
          return 0;
        }

        return progress.filter((p) => {
          const dateStr = p.completed_at || p.updated_at;
          if (!dateStr) {
            return false;
          }

          const pStr = getVirtualDateKey(new Date(dateStr));
          return pStr === checkTodayStr;
        }).length;
      })(),
    };
  } catch (error: unknown) {
    const err = error as Error | undefined;
    if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) {
      return null;
    }
    return null;
  }
}

/**
 * Get total number of active days for a user.
 *
 * @param userId User ID
 * @returns Number of unique active days
 */
export async function getTotalActiveDays(userId: string) {
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('started_at')
    .eq('user_id', userId);

  if (error || !data) return 0;

  const days = new Set(
    data.map((d) => {
      const date = new Date(d.started_at);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(date.getDate()).padStart(2, '0')}`;
    })
  );
  return days.size;
}

/**
 * Get streak milestones (max streak and first 7-day streak date).
 *
 * @param userId User ID
 * @returns Streak milestones
 */
export async function getStreakMilestones(
  userId: string
): Promise<StreakMilestones> {
  const { data, error } = await supabase
    .from('video_progress')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('completed', true)
    .not('completed_at', 'is', null);

  if (error || !data || data.length === 0) {
    return { maxStreak: 0, first7StreakDate: null };
  }

  // Collect unique active days
  const activeDaysSet = new Set<string>();
  for (const row of data) {
    if (!row.completed_at) continue;
    const date = new Date(row.completed_at);
    const dayKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    activeDaysSet.add(dayKey);
  }

  const activeDays = [...activeDaysSet].sort();

  if (activeDays.length === 0) {
    return { maxStreak: 0, first7StreakDate: null };
  }

  // Use utility function for streak calculation
  return calculateStreakMilestones(activeDays);
}

/**
 * Get course mastery scores.
 *
 * @param userId User ID
 * @returns Array of course mastery data
 */
export async function getCourseMastery(
  userId: string
): Promise<CourseMastery[]> {
  // 1. Get all courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, name, total_videos');

  if (coursesError || !courses) return [];

  // 2. Get video progress counts per course
  const { data: vProgress } = await supabase
    .from('video_progress')
    .select('video:videos(course_id)')
    .eq('user_id', userId)
    .eq('completed', true);

  const vCompletedMap: Record<string, number> = {};
  if (vProgress) {
    vProgress.forEach((p: { video: { course_id: string | null } | null }) => {
      const courseId = p.video?.course_id;
      if (courseId) {
        vCompletedMap[courseId] = (vCompletedMap[courseId] || 0) + 1;
      }
    });
  }

  // 3. Get total questions count per course
  const { data: qCounts } = await supabase
    .from('questions')
    .select('course_id');

  const qTotalMap: Record<string, number> = {};
  if (qCounts) {
    qCounts.forEach((q) => {
      qTotalMap[q.course_id] = (qTotalMap[q.course_id] || 0) + 1;
    });
  }

  // 4. Get solved questions count per course
  const { data: solvedQs } = await supabase
    .from('user_quiz_progress')
    .select('course_id')
    .eq('user_id', userId);

  const qSolvedMap: Record<string, number> = {};
  if (solvedQs) {
    solvedQs.forEach((s) => {
      qSolvedMap[s.course_id] = (qSolvedMap[s.course_id] || 0) + 1;
    });
  }

  // 5. Calculate Mastery
  return courses
    .map((c) => {
      const totalVideos = c.total_videos || 0;
      const completedVideos = vCompletedMap[c.id] || 0;
      const totalQuestions = qTotalMap[c.id] || 200;
      const solvedQuestions = qSolvedMap[c.id] || 0;

      const videoRatio = totalVideos > 0 ? completedVideos / totalVideos : 0;
      const questRatio =
        totalQuestions > 0 ? solvedQuestions / totalQuestions : 0;

      // Use 60% video, 40% question weight
      const mastery = Math.round(
        videoRatio * 60 + Math.min(1, questRatio) * 40
      );

      return {
        courseId: c.id,
        courseName: c.name,
        videoProgress: Math.round(videoRatio * 100),
        questionProgress: Math.round(Math.min(1, questRatio) * 100),
        masteryScore: mastery,
      };
    })
    .sort((a, b) => b.masteryScore - a.masteryScore);
}
