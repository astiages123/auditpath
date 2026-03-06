import { supabase } from '@/lib/supabase';
import type { CourseMastery } from '@/features/courses/types/courseTypes';
import { safeQuery } from '@/lib/supabaseHelpers';
import type { Database } from '@/types/database.types';

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
  const { data: courses } = await safeQuery<
    Database['public']['Tables']['courses']['Row'][]
  >(
    supabase
      .from('courses')
      .select('id, name, total_videos, type, course_slug'),
    'getCourseMastery: courses error'
  );

  if (!courses) return [];

  const { data: videoProgress } = await safeQuery<
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

  const completedVideoCountByCourse: Record<string, number> = {};
  if (videoProgress) {
    videoProgress.forEach((progressItem) => {
      const courseId = progressItem.video?.course_id;
      if (courseId) {
        completedVideoCountByCourse[courseId] =
          (completedVideoCountByCourse[courseId] || 0) + 1;
      }
    });
  }

  const { data: questionCounts } = await safeQuery<{ course_id: string }[]>(
    supabase.from('questions').select('course_id'),
    'getCourseMastery: total questions error'
  );

  const totalQuestionCountByCourse: Record<string, number> = {};
  if (questionCounts) {
    questionCounts.forEach((question) => {
      totalQuestionCountByCourse[question.course_id] =
        (totalQuestionCountByCourse[question.course_id] || 0) + 1;
    });
  }

  const { data: solvedQuestions } = await safeQuery<{ course_id: string }[]>(
    supabase
      .from('user_quiz_progress')
      .select('course_id')
      .eq('user_id', userId),
    'getCourseMastery: solved questions error',
    { userId }
  );

  const solvedQuestionCountByCourse: Record<string, number> = {};
  if (solvedQuestions) {
    solvedQuestions.forEach((question) => {
      solvedQuestionCountByCourse[question.course_id] =
        (solvedQuestionCountByCourse[question.course_id] || 0) + 1;
    });
  }

  return courses
    .map((course) => {
      const totalVideos = course.total_videos || 0;
      const completedVideos = completedVideoCountByCourse[course.id] || 0;
      const totalQuestions = totalQuestionCountByCourse[course.id] || 200;
      const solvedQuestionCount = solvedQuestionCountByCourse[course.id] || 0;

      const videoRatio = totalVideos > 0 ? completedVideos / totalVideos : 0;
      const questionRatio =
        totalQuestions > 0 ? solvedQuestionCount / totalQuestions : 0;

      const mastery = Math.round(
        videoRatio * 60 + Math.min(1, questionRatio) * 40
      );

      return {
        courseId: course.id,
        courseName: course.name,
        courseType: course.type || 'video',
        videoProgress: Math.round(videoRatio * 100),
        questionProgress: Math.round(Math.min(1, questionRatio) * 100),
        masteryScore: mastery,
      };
    })
    .sort((leftCourse, rightCourse) => {
      return rightCourse.masteryScore - leftCourse.masteryScore;
    });
}
