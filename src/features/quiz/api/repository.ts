/**
 * Quiz Repository (Data Access Layer)
 *
 * Centralizes all Supabase interactions for the Quiz feature.
 * Strictly typed and separated from business logic.
 */

import { supabase } from "@/shared/lib/core/supabase";
import { type Database, type Json } from "@/shared/types/supabase";
import { type ChunkMasteryRow } from "../core/types";
import { calculateConceptBasedQuota } from "@/shared/lib/core/quota";
import { getSubjectStrategy } from "../algoritma/strategy";

// --- Types ---

export interface SessionCounter {
    current_session: number;
    is_new_session: boolean;
}

export interface UserQuestionStatusRow {
    question_id: string;
    status: Database["public"]["Enums"]["question_status"];
    consecutive_success: number;
    consecutive_fails: number;
    next_review_session: number | null;
}

export interface SessionResultStats {
    correctCount: number;
    incorrectCount: number;
    blankCount: number;
    timeSpentMs: number;
    courseId: string;
    userId: string;
}

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
type NoteChunkRow = Database["public"]["Tables"]["note_chunks"]["Row"];

// --- Session Management ---

export async function incrementCourseSession(
    userId: string,
    courseId: string,
): Promise<{ data: SessionCounter | null; error: Error | null }> {
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
        "increment_course_session",
        {
            p_user_id: userId,
            p_course_id: courseId,
        },
    );

    if (rpcError) {
        console.error("RPC Error:", rpcError);
        return { data: null, error: new Error(rpcError.message) };
    }

    // RPC returns a single object or array depending on definition, but typings should handle it.
    // If it returns array:
    if (Array.isArray(rpcResult) && rpcResult.length > 0) {
        return { data: rpcResult[0], error: null };
    }
    // If it returns object:
    if (rpcResult && !Array.isArray(rpcResult)) {
        return { data: rpcResult, error: null };
    }

    return { data: null, error: new Error("Unknown RPC error") };
}

export async function getSessionInfo(userId: string, courseId: string) {
    const { data } = await supabase
        .from("course_session_counters")
        .select("current_session")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .maybeSingle();

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
    const { data } = await supabase
        .from("courses")
        .select("created_at")
        .eq("id", courseId)
        .single();
    return data?.created_at || null;
}

export async function getQuotaInfo(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _courseId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _sessionNumber: number,
) {
    // Placeholder logic for quota info, presumably handled by backend or simpler check
    return {
        dailyQuota: 50,
        used: 0,
        pendingReviewCount: 0,
        isMaintenanceMode: false,
        reviewQuota: 10,
    };
}

export async function getCourseStats(userId: string, courseId: string) {
    const { data: masteryData } = await supabase
        .from("chunk_mastery")
        .select("total_questions_seen, mastery_score")
        .eq("user_id", userId)
        .eq("course_id", courseId);

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

export async function getCourseName(courseId: string): Promise<string | null> {
    const { data } = await supabase
        .from("courses")
        .select("name")
        .eq("id", courseId)
        .single();
    return data?.name || null;
}

// --- Auth Support ---

export async function getCurrentSessionToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

// --- Question Fetching ---

export async function getTotalQuestionsInCourse(
    courseId: string,
): Promise<number> {
    const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId);
    return count || 0;
}

export async function getArchivedQuestionsCount(
    userId: string,
    courseId: string,
): Promise<number> {
    const { count } = await supabase
        .from("user_question_status")
        .select("id, questions!inner(course_id)", {
            count: "exact",
            head: true,
        })
        .eq("user_id", userId)
        .eq("status", "archived")
        .eq("questions.course_id", courseId);
    return count || 0;
}

export async function getChunkQuestionCount(chunkId: string): Promise<number> {
    const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("chunk_id", chunkId);
    return count || 10;
}

export async function getSolvedQuestionIds(
    userId: string,
    chunkId: string,
): Promise<Set<string>> {
    const { data } = await supabase
        .from("user_quiz_progress")
        .select("question_id")
        .eq("user_id", userId)
        .eq("chunk_id", chunkId);

    return new Set(data?.map((s) => s.question_id) || []);
}

export async function fetchQuestionsByChunk(
    chunkId: string,
    limit: number,
    excludeIds: Set<string>,
): Promise<
    Pick<
        QuestionRow,
        "id" | "chunk_id" | "question_data" | "bloom_level" | "concept_title"
    >[]
> {
    const query = supabase
        .from("questions")
        .select(
            "id, chunk_id, question_data, bloom_level, concept_title",
        )
        .eq("chunk_id", chunkId)
        .limit(limit + excludeIds.size);

    const { data } = await query;
    if (!data) return [];

    return (data as Pick<
        QuestionRow,
        "id" | "chunk_id" | "question_data" | "bloom_level" | "concept_title"
    >[]).filter((q) => !excludeIds.has(q.id)).slice(0, limit);
}

// Interface for joined query result
interface QuestionWithStatus {
    question_id: string;
    status: Database["public"]["Enums"]["question_status"];
    next_review_session: number | null;
    questions: Pick<
        QuestionRow,
        "id" | "chunk_id" | "course_id" | "parent_question_id" | "question_data"
    >;
}

export async function fetchQuestionsByStatus(
    userId: string,
    courseId: string,
    status: "pending_followup" | "active" | "archived",
    maxSession: number | null,
    limit: number,
): Promise<QuestionWithStatus[]> {
    let query = supabase
        .from("user_question_status")
        .select(`
            question_id, status, next_review_session,
            questions!inner (id, chunk_id, course_id, parent_question_id, question_data)
        `)
        .eq("user_id", userId)
        .eq("questions.course_id", courseId)
        .eq("status", status);

    if (maxSession !== null) {
        query = query.lte("next_review_session", maxSession);
    }

    query = query.order("updated_at", { ascending: true }).limit(limit);

    const { data } = await query;
    // Type assertion is often needed for complex joins in Supabase if types aren't perfectly inferred
    return (data as unknown as QuestionWithStatus[]) || [];
}

interface FollowUpQuestionRow {
    id: string;
    chunk_id: string | null;
    course_id: string;
    parent_question_id: string | null;
    question_data: Json;
    user_question_status: { status: string }[];
}

export async function fetchNewFollowups(
    courseId: string,
    limit: number,
): Promise<FollowUpQuestionRow[]> {
    const { data } = await supabase
        .from("questions")
        .select(`
            id, chunk_id, course_id, parent_question_id, question_data,
            user_question_status!left (status)
        `)
        .eq("course_id", courseId)
        .not("parent_question_id", "is", null)
        .or(`status.is.null`, { foreignTable: "user_question_status" })
        .limit(limit);

    return (data as unknown as FollowUpQuestionRow[]) || [];
}

export async function fetchQuestionsByIds(
    ids: string[],
): Promise<
    Pick<
        QuestionRow,
        "id" | "chunk_id" | "question_data" | "bloom_level" | "concept_title"
    >[]
> {
    if (ids.length === 0) return [];
    const { data } = await supabase
        .from("questions")
        .select("id, chunk_id, question_data, bloom_level, concept_title")
        .in("id", ids);
    return (data as Pick<
        QuestionRow,
        "id" | "chunk_id" | "question_data" | "bloom_level" | "concept_title"
    >[]) || [];
}

// --- Progress & State ---

export async function getUserQuestionStatus(
    userId: string,
    questionId: string,
): Promise<UserQuestionStatusRow | null> {
    const { data } = await supabase
        .from("user_question_status")
        .select(
            "question_id, status, consecutive_success, consecutive_fails, next_review_session",
        )
        .eq("user_id", userId)
        .eq("question_id", questionId)
        .maybeSingle();

    if (!data) return null;

    return {
        question_id: data.question_id,
        status: data.status,
        consecutive_success: data.consecutive_success ?? 0,
        consecutive_fails: data.consecutive_fails ?? 0,
        next_review_session: data.next_review_session,
    };
}

export async function recordQuizProgress(
    payload: Database["public"]["Tables"]["user_quiz_progress"]["Insert"],
) {
    return await supabase.from("user_quiz_progress").insert(payload);
}

export async function upsertUserQuestionStatus(
    payload: Database["public"]["Tables"]["user_question_status"]["Insert"],
) {
    return await supabase
        .from("user_question_status")
        .upsert(payload, { onConflict: "user_id,question_id" });
}

export async function getUniqueSolvedCountInChunk(
    userId: string,
    chunkId: string,
): Promise<number> {
    const { count } = await supabase
        .from("user_question_status")
        .select("question_id, questions!inner(chunk_id)", {
            count: "exact",
            head: true,
        })
        .eq("user_id", userId)
        .eq("questions.chunk_id", chunkId)
        .in("status", ["archived", "pending_followup"]);
    return count || 0;
}

export async function getChunkMastery(
    userId: string,
    chunkId: string,
): Promise<ChunkMasteryRow | null> {
    const { data } = await supabase
        .from("chunk_mastery")
        .select(
            "chunk_id, mastery_score, last_full_review_at, total_questions_seen",
        )
        .eq("user_id", userId)
        .eq("chunk_id", chunkId)
        .maybeSingle();

    if (!data) return null;

    return {
        chunk_id: data.chunk_id,
        mastery_score: data.mastery_score,
        last_full_review_at: data.last_full_review_at,
        total_questions_seen: data.total_questions_seen ?? 0,
    };
}

export async function upsertChunkMastery(
    payload: Database["public"]["Tables"]["chunk_mastery"]["Insert"],
): Promise<void> {
    await supabase
        .from("chunk_mastery")
        .upsert(payload, { onConflict: "user_id,chunk_id" });
}

export async function getRecentDiagnoses(
    userId: string,
    chunkId: string,
    limit: number,
): Promise<string[]> {
    const { data } = await supabase
        .from("user_quiz_progress")
        .select("ai_diagnosis")
        .eq("user_id", userId)
        .eq("chunk_id", chunkId)
        .not("ai_diagnosis", "is", null)
        .order("answered_at", { ascending: false })
        .limit(limit);

    return (data || [])
        .map((p) => p.ai_diagnosis)
        .filter((d): d is string => Boolean(d));
}

// --- Metadata & Utils ---

export async function getChunkMetadata(
    chunkId: string,
): Promise<
    Pick<
        NoteChunkRow,
        | "course_id"
        | "metadata"
        | "word_count"
        | "status"
        | "meaningful_word_count"
    > | null
> {
    const { data } = await supabase
        .from("note_chunks")
        .select(
            "course_id, metadata, word_count, status, meaningful_word_count",
        )
        .eq("id", chunkId)
        .single();
    return data;
}

export async function getQuestionData(
    questionId: string,
): Promise<
    Pick<
        QuestionRow,
        "id" | "chunk_id" | "question_data" | "bloom_level" | "concept_title"
    > | null
> {
    const { data } = await supabase
        .from("questions")
        .select("id, chunk_id, question_data, bloom_level, concept_title")
        .eq("id", questionId)
        .single();
    return data as (
        | Pick<
            QuestionRow,
            | "id"
            | "chunk_id"
            | "question_data"
            | "bloom_level"
            | "concept_title"
        >
        | null
    );
}

export async function getCourseStatsAggregate(
    userId: string,
    courseId: string,
) {
    const { data: masteryData } = await supabase
        .from("chunk_mastery")
        .select("total_questions_seen, mastery_score")
        .eq("user_id", userId)
        .eq("course_id", courseId);
    return masteryData;
}

export async function fetchCourseChunks(courseId: string) {
    const { data } = await supabase
        .from("note_chunks")
        .select("id, word_count, metadata")
        .eq("course_id", courseId)
        .eq("status", "COMPLETED");
    return data || [];
}

export async function fetchCourseMastery(courseId: string, userId: string) {
    const { data } = await supabase
        .from("chunk_mastery")
        .select("chunk_id, mastery_score")
        .eq("course_id", courseId)
        .eq("user_id", userId);
    return data || [];
}

export async function fetchPrerequisiteQuestions(
    courseId: string,
    concepts: string[],
    limit: number,
) {
    const { data } = await supabase
        .from("questions")
        .select("id, chunk_id, concept_title, bloom_level")
        .eq("course_id", courseId)
        .in("concept_title", concepts)
        .limit(limit);
    return data || [];
}

export async function fetchGeneratedQuestions(
    chunkId: string,
    usageType: Database["public"]["Enums"]["question_usage_type"],
    limit: number,
) {
    const { data } = await supabase
        .from("questions")
        .select("id")
        .eq("chunk_id", chunkId)
        .eq("usage_type", usageType)
        .order("created_at", { ascending: false })
        .limit(limit);
    return data || [];
}

export async function getAntrenmanQuestionCount(
    chunkId: string,
): Promise<number> {
    const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("chunk_id", chunkId)
        .eq("usage_type", "antrenman");
    return count || 0;
}

// --- Factory Support ---

export async function getChunkWithContent(
    chunkId: string,
): Promise<
    Pick<
        NoteChunkRow,
        | "id"
        | "course_id"
        | "metadata"
        | "word_count"
        | "status"
        | "meaningful_word_count"
        | "content"
        | "display_content"
        | "course_name"
        | "section_title"
    > | null
> {
    const { data } = await supabase
        .from("note_chunks")
        .select(
            "id, course_id, metadata, word_count, status, meaningful_word_count, content, display_content, course_name, section_title",
        )
        .eq("id", chunkId)
        .single();
    return data as (
        | Pick<
            NoteChunkRow,
            | "id"
            | "course_id"
            | "metadata"
            | "word_count"
            | "status"
            | "meaningful_word_count"
            | "content"
            | "display_content"
            | "course_name"
            | "section_title"
        >
        | null
    );
}

export async function updateChunkStatus(
    chunkId: string,
    status: Database["public"]["Enums"]["chunk_generation_status"],
) {
    return await supabase.from("note_chunks").update({ status }).eq(
        "id",
        chunkId,
    );
}

export async function updateChunkMetadata(
    chunkId: string,
    metadata: Json,
) {
    return await supabase.from("note_chunks").update({ metadata }).eq(
        "id",
        chunkId,
    );
}

export async function fetchCachedQuestion(
    chunkId: string,
    usageType: Database["public"]["Enums"]["question_usage_type"],
    conceptTitle: string,
): Promise<
    Pick<
        QuestionRow,
        "id" | "chunk_id" | "question_data" | "bloom_level" | "concept_title"
    > | null
> {
    const { data } = await supabase
        .from("questions")
        .select("id, chunk_id, question_data, bloom_level, concept_title")
        .eq("chunk_id", chunkId)
        .ilike("concept_title", conceptTitle.trim())
        .eq("usage_type", usageType)
        .maybeSingle();
    return data as (
        | Pick<
            QuestionRow,
            | "id"
            | "chunk_id"
            | "question_data"
            | "bloom_level"
            | "concept_title"
        >
        | null
    );
}

export async function createQuestion(
    payload: Database["public"]["Tables"]["questions"]["Insert"],
) {
    return await supabase.from("questions").insert(payload).select("id")
        .single();
}

// --- Quota & Status ---

export async function getChunkQuotaStatus(chunkId: string) {
    const { data } = await supabase
        .from("note_chunks")
        .select(
            "id, course_id, word_count, status, metadata, meaningful_word_count",
        )
        .eq("id", chunkId)
        .single();

    if (!data) return null;

    const metadata = (data.metadata as Record<string, Json>) || {};

    // 1. Live Count (Database Source of Truth)
    const used = await getAntrenmanQuestionCount(chunkId);

    // 2. Get Course & Strategy
    // We need course name to determine importance
    const courseName = await getCourseName(data.course_id);
    const strategy = courseName ? getSubjectStrategy(courseName) : undefined;
    const importance = strategy?.importance || "medium";

    // 3. Concept-based quota calculation
    const concepts = metadata.concept_map as { isException?: boolean }[] || [];

    let totalQuota = 0;

    if (concepts.length === 0) {
        // FALLBACK: Cold Start (No Map yet)
        // Estimate: 1 question per 45 words, min 5.
        // This is the "Antrenman" target for estimation.
        totalQuota = Math.max(5, Math.round((data.word_count || 500) / 45));
    } else {
        // REAL: Knowledge Density Quota
        const quotaResult = calculateConceptBasedQuota(concepts, importance);
        // We target 'antrenman' quota specifically for this UI component
        totalQuota = quotaResult.antrenman;
    }

    return {
        used,
        quota: { total: totalQuota },
        wordCount: data.word_count || 0,
        conceptCount: concepts.length,
        isFull: used >= totalQuota,
        status: data.status || "PENDING",
        difficultyIndex: (metadata.difficulty_index || metadata.density_score ||
            3) as number,
        meaningfulWordCount: data.meaningful_word_count || 0,
    };
}

// --- Session Finalization ---

export async function finishQuizSession(stats: SessionResultStats) {
    // 1. Increment Course Session Counter (Manual Logic since RPC might be missing)
    const { data: existing, error: fetchError } = await supabase
        .from("course_session_counters")
        .select("id, current_session")
        .eq("course_id", stats.courseId)
        .eq("user_id", stats.userId)
        .maybeSingle();

    if (fetchError) {
        console.error("Error fetching session counter:", fetchError);
        // We can continue, but stats might be off.
    }

    const nextSession = (existing?.current_session || 0) + 1;

    const { error: upsertError } = await supabase
        .from("course_session_counters")
        .upsert({
            id: existing?.id, // Includes ID if it exists to perform UPDATE instead of INSERT
            course_id: stats.courseId,
            user_id: stats.userId,
            current_session: nextSession,
            last_session_date: new Date().toISOString(),
        }, {
            onConflict: "user_id,course_id", // Explicitly handle conflict
        });

    if (upsertError) {
        console.error("Error incrementing session counter:", upsertError);
    }

    // 2. Update User XP or General Stats (Optional - mostly handled by triggers if any)
    // For now, we rely on `user_quiz_progress` logs which are already inserted during the quiz.

    // 3. Return aggregated data for the Dashboard (if needed, but usually passed from FE)
    return {
        success: true,
        sessionComplete: true,
    };
}
