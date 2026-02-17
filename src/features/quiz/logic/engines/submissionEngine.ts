import * as Repository from "@/features/quiz/services/repositories/quizRepository";
import { DebugLogger } from "../../logic/utils";
import {
    type QuizResponseType,
    type SubmissionResult,
} from "@/features/quiz/types/quizTypes";
import { calculateQuizResult } from "@/features/quiz/logic/algorithms/scoring";
import { parseOrThrow } from "@/utils/helpers";
import { ChunkMetadataSchema } from "@/features/quiz/types/quizSchemas";
import { type SessionContext } from "./sessionEngine";

/**
 * Submits a quiz answer and updates the database.
 */
export async function submitAnswer(
    ctx: SessionContext,
    questionId: string,
    chunkId: string | null,
    responseType: QuizResponseType,
    timeSpentMs: number,
    selectedAnswer: number | null,
): Promise<SubmissionResult> {
    DebugLogger.group("QuizEngine: Submit Answer", {
        questionId,
        responseType,
    });

    // 1. Parallel Data Collection
    const [currentStatus, questionData] = await Promise.all([
        Repository.getUserQuestionStatus(ctx.userId, questionId),
        Repository.getQuestionData(questionId),
    ]);

    const targetChunkId = chunkId || questionData?.chunk_id || null;

    const [chunkMetadata, masteryData, uniqueSolvedCount, totalChunkQuestions] =
        targetChunkId
            ? await Promise.all([
                Repository.getChunkMetadata(targetChunkId),
                Repository.getChunkMastery(ctx.userId, targetChunkId),
                Repository.getUniqueSolvedCountInChunk(
                    ctx.userId,
                    targetChunkId,
                ),
                Repository.getChunkQuestionCount(targetChunkId),
            ])
            : [null, null, 0, 0];

    // 2. Pure Business Logic (Calculation)
    const result = calculateQuizResult(
        currentStatus,
        responseType,
        timeSpentMs,
        questionData,
        chunkMetadata
            ? {
                content: chunkMetadata.content || null,
                metadata: parseOrThrow(
                    ChunkMetadataSchema,
                    chunkMetadata.metadata,
                ),
            }
            : null,
        masteryData,
        uniqueSolvedCount,
        totalChunkQuestions,
        ctx.sessionNumber,
    );

    // 3. Execution (Repository Updates)
    const updates: Promise<unknown>[] = [
        Repository.upsertUserQuestionStatus({
            user_id: ctx.userId,
            question_id: questionId,
            status: result.newStatus,
            consecutive_success: result.newSuccessCount,
            consecutive_fails: result.newFailsCount,
            next_review_session: result.nextReviewSession,
        }),
        Repository.recordQuizProgress({
            user_id: ctx.userId,
            question_id: questionId,
            chunk_id: targetChunkId,
            course_id: ctx.courseId,
            response_type: responseType,
            selected_answer: selectedAnswer,
            session_number: ctx.sessionNumber,
            is_review_question: false,
            time_spent_ms: timeSpentMs,
        }),
    ];

    if (targetChunkId) {
        updates.push(
            Repository.upsertChunkMastery({
                user_id: ctx.userId,
                chunk_id: targetChunkId,
                course_id: ctx.courseId,
                mastery_score: result.newMastery,
                last_reviewed_session: ctx.sessionNumber,
                updated_at: new Date().toISOString(),
            }),
        );
    }

    await Promise.all(updates);

    DebugLogger.groupEnd();

    return result;
}
