/**
 * Quiz Session Repository (Data Access Layer)
 *
 * Handles session management, course statistics, and quota information.
 */

import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";
import { DAILY_QUOTA } from "@/utils/constants";
import { addToOfflineQueue } from "@/lib/offlineQueueService";

const quizLogger = logger.withPrefix("[QuizSessionRepository]");

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

// --- Helper Functions ---

/**
 * Generic helper for Supabase queries with error handling and offline queue support.
 */
async function safeQuery<T = unknown>(
    queryPromise: PromiseLike<{ data: T | null; error: unknown }>,
    errorMessage: string,
    context?: Record<string, unknown>,
    offlinePayload?: Record<string, unknown>,
): Promise<{ data: T | null; error: Error | null }> {
    try {
        const { data, error } = await queryPromise;

        if (error) {
            quizLogger.error(errorMessage, { ...context, error });
            if (offlinePayload) {
                addToOfflineQueue(offlinePayload);
            }
            const msg = (error as { message?: string })?.message ||
                "Query error";
            return {
                data: null,
                error: new Error(msg),
            };
        }

        return { data, error: null };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        quizLogger.error(`Unexpected error: ${errorMessage}`, {
            ...context,
            error,
        });
        if (offlinePayload) {
            addToOfflineQueue(offlinePayload);
        }
        return { data: null, error };
    }
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
    const { data } = await safeQuery<{ created_at: string }>(
        supabase
            .from("courses")
            .select("created_at")
            .eq("id", courseId)
            .single(),
        "getContentVersion error",
        { courseId },
    );
    return data?.created_at || null;
}

export async function getQuotaInfo(
    _userId: string,
    _courseId: string,
    _sessionNumber: number,
) {
    // Placeholder logic
    return {
        dailyQuota: DAILY_QUOTA,
        used: 0,
        pendingReviewCount: 0,
        isMaintenanceMode: false,
        reviewQuota: 10,
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
        supabase
            .from("course_session_counters")
            .upsert(
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
