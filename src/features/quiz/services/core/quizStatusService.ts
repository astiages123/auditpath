import { supabase } from "@/lib/supabase";
import { handleSupabaseError } from "@/utils/supabaseHelpers";
import { getSubjectStrategy } from "@/features/quiz/logic";
import type {
    ConceptMapItem,
    TopicCompletionStats,
    TopicWithCounts,
} from "@/types";
import { isValid, parseOrThrow } from "@/utils/helpers";
import { ChunkMetadataSchema } from "@/features/quiz/types";

/**
 * Get the number of questions for a specific topic.
 *
 * @param courseId Course ID
 * @param topic Topic name
 * @returns Question count
 */
export async function getTopicQuestionCount(courseId: string, topic: string) {
    const { count, error } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("section_title", topic)
        .eq("usage_type", "antrenman");

    if (error) {
        await handleSupabaseError(error, "getTopicQuestionCount");
        return 0;
    }
    return count || 0;
}

/**
 * Get the total number of questions in the pool for a course by usage type.
 *
 * @param courseId Course ID
 * @param usageType Question usage type
 * @returns Total count of questions in the pool
 */
export async function getCoursePoolCount(
    courseId: string,
    usageType: "antrenman" | "deneme" | "arsiv",
) {
    const { count, error } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("usage_type", usageType);

    if (error) {
        await handleSupabaseError(error, "getCoursePoolCount");
        return 0;
    }
    return count || 0;
}

/**
 * Get completion status for a specific topic.
 *
 * @param userId User ID
 * @param courseId Course ID
 * @param topic Topic name
 * @returns Topic completion statistics
 */
export async function getTopicCompletionStatus(
    userId: string,
    courseId: string,
    topic: string,
): Promise<TopicCompletionStats> {
    // 1. Get Chunk Info
    const { data: chunk } = await supabase
        .from("note_chunks")
        .select("id, course_name, metadata, ai_logic")
        .eq("course_id", courseId)
        .eq("section_title", topic)
        .limit(1)
        .maybeSingle();

    let quota = { total: 0, antrenman: 0, arsiv: 0, deneme: 0 };
    let importance: "high" | "medium" | "low" = "medium";
    let srsDueCount = 0;
    let aiLogic: {
        suggested_quotas: { antrenman: number; arsiv: number; deneme: number };
    } | null = null;
    let concepts: ConceptMapItem[] = [];
    let difficultyIndex: number | null = null;

    if (chunk) {
        // Strategy logic for AI briefing (importance only)
        const strategy = getSubjectStrategy(chunk.course_name);
        if (strategy) {
            importance = strategy.importance;
        }

        // AI logic from ai_logic column (primary source)
        aiLogic = (chunk.ai_logic as {
            suggested_quotas: {
                antrenman: number;
                arsiv: number;
                deneme: number;
            };
        }) || null;
        const aiQuotas = aiLogic?.suggested_quotas;

        // Concepts and Difficulty from metadata
        const metadata = isValid(ChunkMetadataSchema, chunk.metadata)
            ? parseOrThrow(ChunkMetadataSchema, chunk.metadata)
            : null;
        concepts = metadata?.concept_map || [];
        difficultyIndex = metadata?.difficulty_index || null;

        const defaultQuotas = { antrenman: 5, arsiv: 1, deneme: 1 };

        // Use AI quotas if available, otherwise use fallback
        const antrenman = aiQuotas?.antrenman ?? defaultQuotas.antrenman;
        const arsiv = aiQuotas?.arsiv ?? defaultQuotas.arsiv;
        const deneme = aiQuotas?.deneme ?? defaultQuotas.deneme;

        quota = {
            total: antrenman + arsiv + deneme,
            antrenman,
            arsiv,
            deneme,
        };
    }

    // SRS Status calculation
    const { data: sessionCounter } = await supabase
        .from("course_session_counters")
        .select("current_session")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .maybeSingle();

    const currentSession = sessionCounter?.current_session || 1;

    // 2. Get all questions for this topic
    const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("id, usage_type, parent_question_id")
        .eq("course_id", courseId)
        .eq("section_title", topic);

    if (questionsError || !questions) {
        await handleSupabaseError(
            questionsError,
            "getTopicCompletionStatus/questions",
        );
        return {
            completed: false,
            antrenman: {
                solved: 0,
                total: quota.antrenman,
                quota: quota.antrenman,
                existing: 0,
            },
            deneme: {
                solved: 0,
                total: quota.deneme,
                quota: quota.deneme,
                existing: 0,
            },
            arsiv: {
                solved: 0,
                total: quota.arsiv,
                quota: quota.arsiv,
                existing: 0,
                srsDueCount: 0,
            },
            mistakes: { solved: 0, total: 0, existing: 0 },
            importance,
        };
    }

    // 2.5 Calculate SRS Due Count if topic exists
    if (chunk) {
        const { data: dueStatus } = await supabase
            .from("user_question_status")
            .select("question_id")
            .eq("user_id", userId)
            .eq("status", "archived")
            .in(
                "question_id",
                questions.map((q) => q.id),
            )
            .lte("next_review_session", currentSession || 1);

        srsDueCount = dueStatus?.length || 0;
    }

    // 3. Calculate Totals (Existing in DB vs Theoretical Quota)
    const existingCounts = {
        antrenman: 0,
        deneme: 0,
        arsiv: 0,
        mistakes: 0,
    };

    const questionIds = new Set<string>();
    const idToTypeMap = new Map<
        string,
        "antrenman" | "deneme" | "arsiv" | "mistakes"
    >();

    questions.forEach((q) => {
        questionIds.add(q.id);
        let type: "antrenman" | "deneme" | "arsiv" | "mistakes" = "antrenman"; // default

        if (q.parent_question_id) {
            type = "mistakes";
        } else {
            // Explicit types
            if (q.usage_type === "deneme") type = "deneme";
            else if (q.usage_type === "arsiv") type = "arsiv";
            else type = "antrenman";
        }

        idToTypeMap.set(q.id, type);
        existingCounts[type]++;
    });

    // 4. Get User Progress
    const { data: solvedData, error: solvedError } = await supabase
        .from("user_quiz_progress")
        .select("question_id")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .in("question_id", Array.from(questionIds));

    if (solvedError) {
        await handleSupabaseError(
            solvedError,
            "getTopicCompletionStatus/solved",
        );
        return {
            completed: false,
            antrenman: {
                solved: 0,
                total: quota.antrenman,
                quota: quota.antrenman,
                existing: existingCounts.antrenman,
            },
            deneme: {
                solved: 0,
                total: quota.deneme,
                quota: quota.deneme,
                existing: existingCounts.deneme,
            },
            arsiv: {
                solved: 0,
                total: quota.arsiv,
                quota: quota.arsiv,
                existing: existingCounts.arsiv,
                srsDueCount,
            },
            mistakes: {
                solved: 0,
                total: existingCounts.mistakes,
                existing: existingCounts.mistakes,
            },
            importance,
        };
    }

    const solvedCounts = {
        antrenman: 0,
        deneme: 0,
        arsiv: 0,
        mistakes: 0,
    };

    const uniqueSolved = new Set<string>();
    solvedData?.forEach((d) => {
        if (!uniqueSolved.has(d.question_id)) {
            uniqueSolved.add(d.question_id);
            const type = idToTypeMap.get(d.question_id);
            if (type) {
                solvedCounts[type]++;
            }
        }
    });

    // Final Totals - taking the max of Quota vs Existing to ensure we don't show "10/5"
    const antrenmanTotal = Math.max(quota.antrenman, existingCounts.antrenman);
    const denemeTotal = Math.max(quota.deneme, existingCounts.deneme);
    const arsivTotal = Math.max(quota.arsiv, existingCounts.arsiv);
    const mistakesTotal = existingCounts.mistakes;

    // Completed logic: Consistent with the UI display
    const isCompleted = antrenmanTotal > 0 &&
        solvedCounts.antrenman >= antrenmanTotal;

    return {
        completed: isCompleted,
        antrenman: {
            solved: solvedCounts.antrenman,
            total: antrenmanTotal,
            quota: quota.antrenman,
            existing: existingCounts.antrenman,
        },
        deneme: {
            solved: solvedCounts.deneme,
            total: denemeTotal,
            quota: quota.deneme,
            existing: existingCounts.deneme,
        },
        arsiv: {
            solved: solvedCounts.arsiv,
            total: arsivTotal,
            quota: quota.arsiv,
            existing: existingCounts.arsiv,
            srsDueCount,
        },
        mistakes: {
            solved: solvedCounts.mistakes,
            total: mistakesTotal,
            existing: existingCounts.mistakes,
        },
        importance,
        aiLogic,
        concepts,
        difficultyIndex,
    };
}

/**
 * Get all topics for a course with question counts.
 *
 * @param courseId Course ID
 * @returns Array of topics with counts and completion status
 */
export async function getCourseTopicsWithCounts(
    courseId: string,
): Promise<TopicWithCounts[]> {
    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id;

    // 1. Get topics from note_chunks sorted by chunk_order
    const { data: chunks, error: chunksError } = await supabase
        .from("note_chunks")
        .select("section_title, chunk_order")
        .eq("course_id", courseId)
        .order("chunk_order", { ascending: true });

    if (chunksError) {
        await handleSupabaseError(
            chunksError,
            "getCourseTopicsWithCounts/chunks",
        );
        return [];
    }

    // Dedup maintaining order
    const seen = new Set<string>();
    const orderedTopics: string[] = [];
    chunks?.forEach((c) => {
        if (c.section_title && !seen.has(c.section_title)) {
            seen.add(c.section_title);
            orderedTopics.push(c.section_title);
        }
    });

    if (orderedTopics.length === 0) return [];

    // 2. Fetch all questions for this course to aggregate counts
    const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("id, section_title, usage_type, parent_question_id")
        .eq("course_id", courseId);

    if (questionsError) {
        await handleSupabaseError(
            questionsError,
            "getCourseTopicsWithCounts/questions",
        );
        return orderedTopics.map((t) => ({
            name: t,
            isCompleted: false,
            counts: { antrenman: 0, arsiv: 0, deneme: 0, total: 0 },
        }));
    }

    // 2.1 Fetch Solved Questions to determine isCompleted
    const solvedIds = new Set<string>();
    if (userId) {
        const { data: solved } = await supabase
            .from("user_quiz_progress")
            .select("question_id")
            .eq("user_id", userId)
            .eq("course_id", courseId);

        solved?.forEach((s) => solvedIds.add(s.question_id));
    }

    // 3. Aggregate counts & completion
    // Map: Topic -> { antrenmanTotal: 0, antrenmanSolved: 0, ...others }
    const topicStats: Record<
        string,
        {
            antrenman: number;
            arsiv: number;
            deneme: number;
            total: number;
            antrenmanSolved: number; // To check completion
        }
    > = {};

    // Initialize
    orderedTopics.forEach((t) => {
        topicStats[t] = {
            antrenman: 0,
            arsiv: 0,
            deneme: 0,
            total: 0,
            antrenmanSolved: 0,
        };
    });

    questions?.forEach((q) => {
        const t = q.section_title;
        if (topicStats[t]) {
            topicStats[t].total += 1;
            const type = q.usage_type as string;

            if (q.parent_question_id) {
                // Mistake question - doesn't count towards 'Antrenman' total for badge
            } else {
                if (type === "antrenman") {
                    topicStats[t].antrenman += 1;
                    if (solvedIds.has(q.id)) {
                        topicStats[t].antrenmanSolved += 1;
                    }
                } else if (type === "arsiv") topicStats[t].arsiv += 1;
                else if (type === "deneme") topicStats[t].deneme += 1;
            }
        }
    });

    return orderedTopics.map((topic) => {
        const s = topicStats[topic];
        const isCompleted = s.antrenman > 0 && s.antrenmanSolved >= s.antrenman;

        return {
            name: topic,
            isCompleted,
            counts: {
                antrenman: s.antrenman,
                arsiv: s.arsiv,
                deneme: s.deneme,
                total: s.total,
            },
        };
    });
}
