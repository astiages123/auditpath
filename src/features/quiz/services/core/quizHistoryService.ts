import { supabase } from "@/lib/supabase";
import { handleSupabaseError } from "@/lib/supabaseHelpers";
import type {
  CognitiveInsight,
  RecentQuizSession,
} from "@/features/quiz/types/quizTypes";

/**
 * Get recent quiz sessions for a user.
 *
 * @param userId User ID
 * @param limit Maximum number of sessions to return
 * @returns Array of recent quiz sessions
 */
export async function getRecentQuizSessions(
  userId: string,
  limit: number = 5,
): Promise<RecentQuizSession[]> {
  // Fetch last 500 answers to reconstruct sessions
  const { data: rawData, error } = await supabase
    .from("user_quiz_progress")
    .select(
      `
            course_id,
            session_number,
            response_type,
            answered_at,
            course:courses(name)
        `,
    )
    .eq("user_id", userId)
    .order("answered_at", { ascending: false })
    .limit(500);

  if (error || !rawData) {
    await handleSupabaseError(error, "getRecentQuizSessions");
    return [];
  }

  const sessionsMap = new Map<string, RecentQuizSession>();

  rawData.forEach(
    (row: {
      course_id: string;
      session_number: number;
      response_type: string;
      answered_at: string | null;
      course: { name: string } | null;
    }) => {
      const sNum = row.session_number || 0;
      const key = `${row.course_id}-${sNum}`;

      if (!sessionsMap.has(key)) {
        sessionsMap.set(key, {
          uniqueKey: key,
          courseName: row.course?.name || "Kavram Testi",
          sessionNumber: sNum,
          date: row.answered_at || new Date().toISOString(),
          correct: 0,
          incorrect: 0,
          blank: 0,
          total: 0,
          successRate: 0,
        });
      }

      const session = sessionsMap.get(key)!;
      session.total++;
      if (row.response_type === "correct") session.correct++;
      else if (row.response_type === "incorrect") session.incorrect++;
      else session.blank++;

      // Keep the latest timestamp for the session
      if (
        row.answered_at &&
        new Date(row.answered_at) > new Date(session.date)
      ) {
        session.date = row.answered_at;
      }
    },
  );

  const sessions = Array.from(sessionsMap.values())
    .map((s) => ({
      ...s,
      successRate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return sessions.slice(0, limit);
}

/**
 * Get recent cognitive insights from AI diagnosis.
 *
 * @param userId User ID
 * @param limit Maximum number of insights to return
 * @returns Array of cognitive insights
 */
export async function getRecentCognitiveInsights(
  userId: string,
  limit: number = 30,
): Promise<CognitiveInsight[]> {
  // 1. Fetch recent progress with diagnosis or insight
  const { data: progressData, error } = await supabase
    .from("user_quiz_progress")
    .select(
      "id, course_id, question_id, ai_diagnosis, ai_insight, response_type, answered_at",
    )
    .eq("user_id", userId)
    .or("ai_diagnosis.neq.null,ai_insight.neq.null")
    .order("answered_at", { ascending: false })
    .limit(limit);

  if (error || !progressData) {
    await handleSupabaseError(error, "getRecentCognitiveInsights");
    return [];
  }

  // 2. Fetch current consecutive_fails for these questions
  const questionIds = Array.from(
    new Set(progressData.map((p) => p.question_id)),
  );

  const { data: statusData } = await supabase
    .from("user_question_status")
    .select("question_id, consecutive_fails")
    .eq("user_id", userId)
    .in("question_id", questionIds);

  const failsMap = new Map<string, number>();
  if (statusData) {
    statusData.forEach((s) => {
      failsMap.set(s.question_id, s.consecutive_fails || 0);
    });
  }

  // 3. Merge data
  return progressData.map((p) => ({
    id: p.id,
    courseId: p.course_id,
    questionId: p.question_id,
    diagnosis: p.ai_diagnosis,
    insight: p.ai_insight,
    consecutiveFails: failsMap.get(p.question_id) || 0,
    responseType: p.response_type,
    date: p.answered_at || new Date().toISOString(),
  }));
}
