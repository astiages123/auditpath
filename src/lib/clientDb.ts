import { supabase } from '@/lib/supabase';
import type { Category, Course } from '@/types';
import { logger } from '@/utils/logger';

// ============================================================================
// RE-EXPORTS FROM SERVICE FILES
// ============================================================================

// Video Service
export {
  getDailyVideoMilestones,
  getVideoProgress,
  toggleVideoProgress,
  toggleVideoProgressBatch,
} from '@/features/courses/services/videoService';

// Achievement Service
export {
  getUnlockedAchievements,
  unlockAchievement,
} from '@/features/achievements/services/achievementService';

// Pomodoro Service
export {
  deletePomodoroSession,
  getDailySessionCount,
  getLatestActiveSession,
  getRecentActivitySessions,
  getRecentSessions,
  updatePomodoroHeartbeat,
  upsertPomodoroSession,
} from '@/features/pomodoro/services';

// Quiz Service
export {
  getBloomStats,
  getCourseIdBySlug,
  getCoursePoolCount,
  getCourseProgress,
  getCourseTopics,
  getCourseTopicsWithCounts,
  getFirstChunkIdForTopic,
  getNoteChunkById,
  getQuizStats,
  getRecentCognitiveInsights,
  getRecentQuizSessions,
  getSRSStats,
  getSubjectCompetency,
  getTopicCompletionStatus,
  getTopicQuestionCount,
  getTopicQuestions,
  getUniqueCourseTopics,
} from '@/features/quiz/services/core/quizService';

// User Stats Service
export {
  getCourseMastery,
  getStreakMilestones,
  getTotalActiveDays,
  getUserStats,
} from '@/features/achievements/services/userStatsService';

// Efficiency Service
export {
  getDailyEfficiencySummary,
  getEfficiencyRatio,
  getEfficiencyTrend,
  getFocusTrend,
} from '@/features/efficiency/services';

// Activity Service
export {
  getCumulativeStats,
  getDailyStats,
  getHistoryStats,
  getLast30DaysActivity,
} from '@/features/efficiency/services/activityService';

// Rank Utils
export type { Rank } from '@/types';
export { RANKS } from '@/utils/constants';
export { getNextRank, getRankForPercentage } from '@/utils/helpers';

// Category Utils
export { normalizeCategorySlug } from '@/utils/helpers';

// ============================================================================
// SHARED FUNCTIONS (Category & Course Management)
// ============================================================================

export async function getCategories(): Promise<Category[]> {
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*, courses(*)')
    .order('sort_order');

  if (catError || !categories) {
    if (catError) {
      const isAbort =
        catError.message?.includes('AbortError') ||
        catError.code === 'ABORT_ERROR';
      if (!isAbort) {
        // Log to external service if needed
      }
    }
    return [];
  }

  return categories;
}

export async function getAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('sort_order');

  if (error) {
    logger.error('Error fetching all courses:', error);
    return [];
  }
  return data || [];
}
