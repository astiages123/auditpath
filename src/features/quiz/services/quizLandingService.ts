import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export interface LandingCourseStats {
  courseId: string;
  averageMastery: number;
  lastStudyDate: string | null;
  difficultSubject: string | null;
}

/**
 * Fetches personalized statistics for all courses to be displayed on the Quiz Landing Page.
 */
export async function getLandingDashboardData(
  userId: string
): Promise<Record<string, LandingCourseStats>> {
  try {
    // 1. Fetch all mastery data joined with course info
    const { data: masteryData, error: masteryError } = await supabase
      .from('chunk_mastery')
      .select(
        `
        mastery_score,
        chunk_id,
        note_chunks!inner(course_id, section_title)
      `
      )
      .eq('user_id', userId);

    if (masteryError) throw masteryError;

    // 2. Fetch last study activity for all courses
    const { data: activityData, error: activityError } = await supabase
      .from('user_quiz_progress')
      .select('course_id, answered_at')
      .eq('user_id', userId)
      .order('answered_at', { ascending: false });

    if (activityError) throw activityError;

    const stats: Record<string, LandingCourseStats> = {};

    // Process Mastery & Difficult Subject
    const courseGroups: Record<
      string,
      {
        totalScore: number;
        count: number;
        subjects: Record<string, { total: number; count: number }>;
      }
    > = {};

    masteryData?.forEach(
      (item: {
        mastery_score: number;
        note_chunks: { course_id: string; section_title: string };
      }) => {
        const courseId = item.note_chunks.course_id;
        const subject = item.note_chunks.section_title;
        const score = item.mastery_score || 0;

        if (!courseGroups[courseId]) {
          courseGroups[courseId] = {
            totalScore: 0,
            count: 0,
            subjects: {},
          };
        }

        courseGroups[courseId].totalScore += score;
        courseGroups[courseId].count += 1;

        if (subject) {
          if (!courseGroups[courseId].subjects[subject]) {
            courseGroups[courseId].subjects[subject] = {
              total: 0,
              count: 0,
            };
          }
          courseGroups[courseId].subjects[subject].total += score;
          courseGroups[courseId].subjects[subject].count += 1;
        }
      }
    );

    // Calculate Averages and find difficult subjects
    Object.entries(courseGroups).forEach(([courseId, data]) => {
      let difficultSubject = null;
      let minScore = Infinity;

      Object.entries(data.subjects).forEach(([subject, sData]) => {
        const avg = sData.total / sData.count;
        if (avg < minScore) {
          minScore = avg;
          difficultSubject = subject;
        }
      });

      stats[courseId] = {
        courseId,
        averageMastery:
          data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
        lastStudyDate: null,
        difficultSubject: minScore < 80 ? difficultSubject : null, // Only show as difficult if below 80%
      };
    });

    // Map Last Study Date
    activityData?.forEach((activity) => {
      if (
        stats[activity.course_id] &&
        !stats[activity.course_id].lastStudyDate
      ) {
        stats[activity.course_id].lastStudyDate = activity.answered_at;
      } else if (!stats[activity.course_id]) {
        // If course has activity but no chunks mastered yet
        stats[activity.course_id] = {
          courseId: activity.course_id,
          averageMastery: 0,
          lastStudyDate: activity.answered_at,
          difficultSubject: null,
        };
      }
    });

    return stats;
  } catch (err) {
    logger.error('Error fetching landing dashboard data:', err as Error);
    return {};
  }
}
