import { supabase } from '@/lib/supabase';
import type { CourseMastery } from '@/features/courses/types/courseTypes';
import { safeQuery } from '@/lib/supabaseHelpers';
import type { Database } from '@/types/database.types';

// ===========================
// === MASTERY CALCULATION ===
// ===========================

/**
 * Calculates and retrieves course mastery scores for a user.
 * Combines video progress and question progress into a weighted mastery score.
 *
 * @param userId - The UUID of the user
 * @returns A promise resolving to an array of course mastery data, sorted by descending score
 */
export async function getCourseMastery(
  userId: string
): Promise<CourseMastery[]> {
  try {
    // 1. Get all courses
    const { data: courses } = await safeQuery<
      Database['public']['Tables']['courses']['Row'][]
    >(
      supabase
        .from('courses')
        .select('id, name, total_videos, type, course_slug'),
      'getCourseMastery: courses error'
    );

    if (!courses) return [];

    // 2. Get video progress counts per course
    const { data: vProgress } = await safeQuery<
      { video: { course_id: string | null } | null }[]
    >(
      supabase
        .from('video_progress')
        .select('video:videos(course_id)')
        .eq('user_id', userId)
        .eq('completed', true),
      'getCourseMastery: video progress error',
      { userId }
    );

    const vCompletedMap: Record<string, number> = {};
    if (vProgress) {
      vProgress.forEach((p) => {
        const courseId = p.video?.course_id;
        if (courseId) {
          vCompletedMap[courseId] = (vCompletedMap[courseId] || 0) + 1;
        }
      });
    }

    // 3. Get total questions count per course
    const { data: qCounts } = await safeQuery<{ course_id: string }[]>(
      supabase.from('questions').select('course_id'),
      'getCourseMastery: total questions error'
    );

    const qTotalMap: Record<string, number> = {};
    if (qCounts) {
      qCounts.forEach((q) => {
        qTotalMap[q.course_id] = (qTotalMap[q.course_id] || 0) + 1;
      });
    }

    // 4. Get solved questions count per course
    const { data: solvedQs } = await safeQuery<{ course_id: string }[]>(
      supabase
        .from('user_quiz_progress')
        .select('course_id')
        .eq('user_id', userId),
      'getCourseMastery: solved questions error',
      { userId }
    );

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
          courseType: c.type || 'video',
          videoProgress: Math.round(videoRatio * 100),
          questionProgress: Math.round(Math.min(1, questRatio) * 100),
          masteryScore: mastery,
        };
      })
      .sort((a, b) => b.masteryScore - a.masteryScore);
  } catch (error) {
    console.error('[courseMasteryService][getCourseMastery] Error:', error);
    return [];
  }
}
