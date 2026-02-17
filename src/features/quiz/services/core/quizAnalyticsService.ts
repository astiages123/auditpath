import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/supabaseHelpers';
import type {
  BloomStats,
  QuizStats,
  SRSStats,
  SubjectCompetency,
} from '@/types';

/**
 * Get overall quiz statistics for a user.
 *
 * @param userId User ID
 * @returns Quiz statistics
 */
export async function getQuizStats(userId: string): Promise<QuizStats> {
  const { data, error } = await supabase
    .from('user_quiz_progress')
    .select('response_type')
    .eq('user_id', userId);

  if (error) {
    await handleSupabaseError(error, 'getQuizStats');
    return {
      totalAnswered: 0,
      correct: 0,
      incorrect: 0,
      blank: 0,
      remaining: 0,
      successRate: 0,
    };
  }

  const totalAnswered = data?.length || 0;
  const correct =
    data?.filter((r) => r.response_type === 'correct').length || 0;
  const incorrect =
    data?.filter((r) => r.response_type === 'incorrect').length || 0;
  const blank = data?.filter((r) => r.response_type === 'blank').length || 0;

  return {
    totalAnswered,
    correct,
    incorrect,
    blank,
    remaining: 0,
    successRate:
      totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0,
  };
}

/**
 * Get subject-wise competency scores.
 *
 * @param userId User ID
 * @returns Array of subject competency scores
 */
export async function getSubjectCompetency(
  userId: string
): Promise<SubjectCompetency[]> {
  const coursesRes = await supabase.from('courses').select('id, name');
  if (coursesRes.error) return [];

  const courseMap = new Map(coursesRes.data.map((c) => [c.id, c.name]));

  const { data, error } = await supabase
    .from('user_quiz_progress')
    .select('course_id, response_type')
    .eq('user_id', userId);

  if (error || !data) return [];

  const stats: Record<string, { correct: number; total: number }> = {};

  data.forEach((row) => {
    const cName = courseMap.get(row.course_id) || 'Unknown';
    if (!stats[cName]) stats[cName] = { correct: 0, total: 0 };

    stats[cName].total += 1;
    if (row.response_type === 'correct') {
      stats[cName].correct += 1;
    }
  });

  return Object.entries(stats)
    .map(([subject, val]) => ({
      subject,
      score: Math.round((val.correct / val.total) * 100),
      totalQuestions: val.total,
    }))
    .sort((a, b) => b.totalQuestions - a.totalQuestions)
    .slice(0, 6);
}

/**
 * Get Bloom's taxonomy level statistics.
 *
 * @param userId User ID
 * @returns Array of Bloom level statistics
 */
export async function getBloomStats(userId: string): Promise<BloomStats[]> {
  const { data, error } = await supabase
    .from('user_quiz_progress')
    .select('response_type, question:questions(bloom_level)')
    .eq('user_id', userId);

  if (error || !data) return [];

  const levels: Record<string, { correct: number; total: number }> = {
    knowledge: { correct: 0, total: 0 },
    application: { correct: 0, total: 0 },
    analysis: { correct: 0, total: 0 },
  };

  data.forEach(
    (row: {
      response_type: string;
      question: { bloom_level: string | null } | null;
    }) => {
      const bloomLevel = row.question?.bloom_level;
      if (bloomLevel && levels[bloomLevel]) {
        levels[bloomLevel].total += 1;
        if (row.response_type === 'correct') {
          levels[bloomLevel].correct += 1;
        }
      }
    }
  );

  return Object.entries(levels).map(([key, val]) => ({
    level: key,
    correct: val.correct,
    questionsSolved: val.total,
    score: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
  }));
}

/**
 * Get SRS (Spaced Repetition System) statistics.
 *
 * @param userId User ID
 * @returns SRS statistics by mastery level
 */
export async function getSRSStats(userId: string): Promise<SRSStats> {
  const { data, error } = await supabase
    .from('chunk_mastery')
    .select('mastery_score')
    .eq('user_id', userId);

  if (error || !data) return { new: 0, learning: 0, review: 0, mastered: 0 };

  const stats = { new: 0, learning: 0, review: 0, mastered: 0 };

  data.forEach((row) => {
    // Proxy SRS levels from mastery_score (0-100)
    const score = row.mastery_score || 0;
    if (score === 0) stats.new++;
    else if (score < 40) stats.learning++;
    else if (score < 80) stats.review++;
    else stats.mastered++;
  });

  return stats;
}
