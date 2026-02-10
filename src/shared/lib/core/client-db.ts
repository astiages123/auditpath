import { supabase } from "@/shared/lib/core/supabase";
import type { Category, Course } from "@/shared/types/courses";

// ============================================================================
// RE-EXPORTS FROM SERVICE FILES
// ============================================================================

// Video Service
export {
  getDailyVideoMilestones,
  getVideoProgress,
  toggleVideoProgress,
  toggleVideoProgressBatch,
} from "./services/video.service";

// Achievement Service
export {
  getUnlockedAchievements,
  unlockAchievement,
} from "./services/achievement.service";

// Pomodoro Service
export {
  deletePomodoroSession,
  getDailySessionCount,
  getLatestActiveSession,
  getRecentActivitySessions,
  getRecentSessions,
  updatePomodoroHeartbeat,
  upsertPomodoroSession,
} from "./services/pomodoro.service";

// Quiz Service
export {
  getBloomStats,
  getCourseIdBySlug,
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
} from "./services/quiz.service";

// Stats Service
export {
  getCourseMastery,
  getCumulativeStats,
  getDailyEfficiencySummary,
  getDailyStats,
  getEfficiencyRatio,
  getEfficiencyTrend,
  getFocusTrend,
  getHistoryStats,
  getLast30DaysActivity,
  getStreakMilestones,
  getTotalActiveDays,
  getUserStats,
} from "./services/stats.service";

// Rank Utils
export type { Rank } from "./utils/rank-utils";
export { getNextRank, getRankForPercentage, RANKS } from "./utils/rank-utils";

// Category Utils
export { normalizeCategorySlug } from "./utils/category-utils";

// ============================================================================
// SHARED FUNCTIONS (Category & Course Management)
// ============================================================================

export async function getCategories(): Promise<Category[]> {
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("*, courses(*)")
    .order("sort_order");

  if (catError) {
    const isAbort = catError.message?.includes("AbortError") ||
      catError.code === "ABORT_ERROR";
    if (!isAbort) {
      // Log to external service if needed
    }
    return [];
  }

  return categories as Category[];
}

export async function getAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order");

  if (error) {
    console.error("Error fetching all courses:", error);
    return [];
  }
  return data || [];
}
