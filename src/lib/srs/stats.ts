import { supabase } from '@/lib/supabase';
import { getUserStats } from '@/lib/client-db';

export interface CourseStats {
  totalQuestionsSolved: number;
  averageMastery: number;
  currentStreak: number;
}

/**
 * Calculates overall progress and stats for a specific course
 */
export async function getCourseStats(
  userId: string,
  courseId: string
): Promise<CourseStats> {
  try {
    // 1. Get total questions solved (sum of total_questions_seen in chunk_mastery)
    // We use chunk_mastery because it aggregates questions better per concept
    const { data: masteryData, error: masteryError } = await supabase
      .from('chunk_mastery')
      .select('total_questions_seen, mastery_score')
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (masteryError) throw masteryError;

    let totalQuestionsSolved = 0;
    let totalMasteryScore = 0;
    
    // Calculate totals
    masteryData?.forEach(row => {
      totalQuestionsSolved += row.total_questions_seen ?? 0;
      totalMasteryScore += row.mastery_score ?? 0;
    });

    // Calculate average mastery (0-100 scale, Shelf System uses mastery_score directly)
    const chunkCount = masteryData?.length || 1;
    const averageMastery = Math.round(totalMasteryScore / chunkCount);

    // 2. Get current streak from DB
    const stats = await getUserStats(userId);
    const currentStreak = stats?.streak || 0;
    
    return {
      totalQuestionsSolved,
      averageMastery: Math.min(100, Math.max(0, averageMastery)),
      currentStreak
    };

  } catch (error) {
    console.error('Error fetching course stats:', error);
    return {
      totalQuestionsSolved: 0,
      averageMastery: 0,
      currentStreak: 0
    };
  }
}
