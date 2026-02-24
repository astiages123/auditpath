import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

interface VideoProgressWithVideo {
  video: {
    course_id: string | null;
    duration_minutes: number | null;
  } | null;
}

export interface LandingCourseStats {
  courseId: string;
  averageMastery: number;
  videoProgress: number;
  totalQuestions: number;
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

    // 3. Fetch all completed video progress for this user
    const { data: videoData, error: videoError } = await supabase
      .from('video_progress')
      .select('video:videos(duration_minutes, course_id)')
      .eq('user_id', userId)
      .eq('completed', true);

    if (videoError) throw videoError;

    // 4. Fetch all courses to get total hours
    const { data: allCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id, total_hours');

    if (coursesError) throw coursesError;

    const stats: Record<string, LandingCourseStats> = {};

    // 0. Initialize stats for ALL courses from the database
    allCourses?.forEach((course) => {
      stats[course.id] = {
        courseId: course.id,
        averageMastery: 0,
        videoProgress: 0,
        totalQuestions: 0,
        lastStudyDate: null,
        difficultSubject: null,
      };
    });

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

    // 5. Finalize stats for all courses
    const allCourseIds = Object.keys(stats);
    await Promise.all(
      allCourseIds.map(async (courseId) => {
        // Calculate Mastery & Difficult Subject if exists
        const data = courseGroups[courseId];
        if (data) {
          let difficultSubject = null;
          let minScore = Infinity;

          Object.entries(data.subjects).forEach(([subject, sData]) => {
            const avg = sData.total / sData.count;
            if (avg < minScore) {
              minScore = avg;
              difficultSubject = subject;
            }
          });

          stats[courseId].averageMastery = Math.round(
            data.totalScore / data.count
          );
          stats[courseId].difficultSubject =
            minScore < 80 ? difficultSubject : null;
        }

        // Calculate Video Progress for EVERY course
        const videosForCourse =
          videoData?.filter(
            (v: VideoProgressWithVideo) => v.video?.course_id === courseId
          ) || [];
        const completedMinutes = videosForCourse.reduce(
          (acc: number, v: VideoProgressWithVideo) =>
            acc + (v.video?.duration_minutes || 0),
          0
        );
        const courseTotalHours =
          allCourses?.find((c) => c.id === courseId)?.total_hours || 0;

        stats[courseId].videoProgress =
          courseTotalHours > 0
            ? Math.min(
                100,
                Math.round((completedMinutes / (courseTotalHours * 60)) * 100)
              )
            : 0;

        // Fetch Total Questions for EVERY course
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .is('parent_question_id', null);

        stats[courseId].totalQuestions = count || 0;
      })
    );

    // 6. Map Last Study Date from Activity
    activityData?.forEach((activity) => {
      if (
        stats[activity.course_id] &&
        !stats[activity.course_id].lastStudyDate
      ) {
        stats[activity.course_id].lastStudyDate = activity.answered_at;
      }
    });

    return stats;
  } catch (err) {
    logger.error('Error fetching landing dashboard data:', err as Error);
    return {};
  }
}
