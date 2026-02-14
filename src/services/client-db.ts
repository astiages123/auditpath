import { supabase } from "@/services/supabase";
import type { Category, Course } from "@/types";
import { logger } from "@/utils/logger";

// ============================================================================
// RE-EXPORTS FROM SERVICE FILES
// ============================================================================

// Video Service
export {
  getDailyVideoMilestones,
  getVideoProgress,
  toggleVideoProgress,
  toggleVideoProgressBatch,
} from "@/features/courses/video.service";

// Achievement Service
export {
  getUnlockedAchievements,
  unlockAchievement,
} from "@/features/achievements/achievement.service";

// Pomodoro Service
export {
  deletePomodoroSession,
  getDailySessionCount,
  getLatestActiveSession,
  getRecentActivitySessions,
  getRecentSessions,
  updatePomodoroHeartbeat,
  upsertPomodoroSession,
} from "@/features/pomodoro/pomodoro.service";

// Quiz Service
export {
  getBloomStats,
  getCourseIdBySlug,
  getCoursePoolCount,
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
} from "@/features/quiz/quiz.service";

// User Stats Service
export {
  getCourseMastery,
  getStreakMilestones,
  getTotalActiveDays,
  getUserStats,
} from "@/services/user-stats.service";

// Efficiency Service
export {
  getDailyEfficiencySummary,
  getEfficiencyRatio,
  getEfficiencyTrend,
  getFocusTrend,
} from "@/features/efficiency/efficiency.service";

// Activity Service
export {
  getCumulativeStats,
  getDailyStats,
  getHistoryStats,
  getLast30DaysActivity,
} from "@/services/activity.service";

// Rank Utils
export type { Rank } from "@/utils/helpers";
export { getNextRank, getRankForPercentage, RANKS } from "@/utils/helpers";

// Category Utils
export { normalizeCategorySlug } from "@/utils/helpers";

// ============================================================================
// SHARED FUNCTIONS (Category & Course Management)
// ============================================================================

export async function getCategories(): Promise<Category[]> {
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("*, courses(*)")
    .order("sort_order");

  if (catError || !categories) {
    if (catError) {
      const isAbort = catError.message?.includes("AbortError") ||
        catError.code === "ABORT_ERROR";
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
    .from("courses")
    .select("*")
    .order("sort_order");

  if (error) {
    logger.error("Error fetching all courses:", error);
    return [];
  }
  return data || [];
}
