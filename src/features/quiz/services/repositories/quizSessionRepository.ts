/**
 * Quiz Session Repository (Data Access Layer)
 *
 * Handles session management, course statistics, and quota information.
 */

import { supabase } from "@/lib/supabase";
import { DAILY_QUOTA } from "@/utils/constants";
import { safeQuery } from "@/lib/supabaseHelpers";

// --- Types ---

export interface SessionCounter {
  current_session: number;
  is_new_session: boolean;
}

export interface SessionResultStats {
  correctCount: number;
  incorrectCount: number;
  blankCount: number;
  timeSpentMs: number;
  courseId: string;
  userId: string;
}

// --- Session Management ---

export async function incrementCourseSession(
  userId: string,
  courseId: string,
): Promise<{ data: SessionCounter | null; error: Error | null }> {
  return safeQuery(
    supabase.rpc("increment_course_session", {
      p_user_id: userId,
      p_course_id: courseId,
    }),
    "incrementCourseSession error",
    { userId, courseId },
  ).then(({ data, error }) => {
    if (error) return { data: null, error };
    // Handle RPC return types (array or object)
    if (Array.isArray(data) && data.length > 0) {
      return { data: data[0], error: null };
    }
    if (data && !Array.isArray(data)) {
      return { data: data as SessionCounter, error: null };
    }
    return { data: null, error: new Error("Unknown RPC ID return") };
  });
}

export async function getSessionInfo(userId: string, courseId: string) {
  const { data } = await safeQuery<{ current_session: number | null }>(
    supabase
      .from("course_session_counters")
      .select("current_session")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle(),
    "getSessionInfo error",
    { userId, courseId },
  );

  if (!data) return { currentSession: 1, totalSessions: 0, courseId };

  return {
    currentSession: data.current_session || 1,
    totalSessions: data.current_session || 1,
    courseId,
  };
}

export async function getContentVersion(
  courseId: string,
): Promise<string | null> {
  const { data } = await safeQuery<{ updated_at: string }>(
    supabase.from("courses").select("updated_at").eq("id", courseId).single(),
    "getContentVersion error",
    { courseId },
  );
  return data?.updated_at || null;
}

export async function getQuotaInfo(
  userId: string,
  courseId: string,
  _sessionNumber: number,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Bugün çözülen toplam soru sayısı (Global)
  const { count: usedToday } = await supabase
    .from("user_quiz_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("answered_at", today.toISOString());

  // 2. Bu kurs için bekleyen tekrar (pending_followup) sayısı
  const { count: pendingCount } = await supabase
    .from("user_question_status")
    .select("question_id, questions!inner(course_id)", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .eq("questions.course_id", courseId)
    .eq("status", "pending_followup");

  return {
    dailyQuota: DAILY_QUOTA,
    used: usedToday || 0,
    pendingReviewCount: pendingCount || 0,
    isMaintenanceMode: false,
    reviewQuota: Math.min(10, pendingCount || 0),
  };
}

export async function getCourseStats(userId: string, courseId: string) {
  const { data: masteryData } = await safeQuery<
    { total_questions_seen: number | null; mastery_score: number }[]
  >(
    supabase
      .from("chunk_mastery")
      .select("total_questions_seen, mastery_score")
      .eq("user_id", userId)
      .eq("course_id", courseId),
    "getCourseStats error",
    { userId, courseId },
  );

  if (!masteryData || masteryData.length === 0) return null;

  const totalQuestionsSolved = masteryData.reduce(
    (sum, row) => sum + (row.total_questions_seen || 0),
    0,
  );
  const avgMastery = Math.round(
    masteryData.reduce((sum, row) => sum + row.mastery_score, 0) /
      masteryData.length,
  );

  return {
    totalQuestionsSolved,
    averageMastery: avgMastery,
  };
}

export async function finishQuizSession(
  stats: SessionResultStats,
): Promise<{ success: boolean; sessionComplete?: boolean; error?: Error }> {
  const { error } = await safeQuery<null>(
    supabase.from("course_session_counters").upsert(
      {
        course_id: stats.courseId,
        user_id: stats.userId,
        current_session: 1,
        last_session_date: new Date().toISOString(),
      },
      {
        onConflict: "user_id,course_id",
      },
    ),
    "finishQuizSession error",
    { userId: stats.userId, courseId: stats.courseId },
  );

  if (error) return { success: false, error };
  return { success: true, sessionComplete: true };
}
