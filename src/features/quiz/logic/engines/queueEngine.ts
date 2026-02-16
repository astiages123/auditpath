import * as Repository from "@/features/quiz/services/repositories/quizRepository";
import { DebugLogger } from "../../logic/utils";
import { type ReviewItem } from "@/features/quiz/types";
import { type SessionContext } from "./sessionEngine";

/**
 * Generates the review queue for the current session.
 *
 * Strategy:
 * 1. Follow-up Pool (High Priority): Pending items from previous sessions (Target: 20%).
 * 2. Training Pool (Medium Priority): Active questions from current/recent chunks (Target: 70%).
 * 3. Archive Mechanism (Low Priority): Re-asking mastered topics (Archive Refresh) (Target: 10%).
 */
export async function getReviewQueue(
    ctx: SessionContext,
    limit: number = 20,
    targetChunkId?: string,
): Promise<ReviewItem[]> {
    DebugLogger.group("QuizEngine: Build Queue", {
        session: ctx.sessionNumber,
        targetChunkId,
    });

    const queue: ReviewItem[] = [];
    const usedIds = new Set<string>();

    // --- 1. Follow-up Pool (Target: 20%) ---
    const followupLimit = Math.ceil(limit * 0.2);
    const followups = await Repository.fetchQuestionsByStatus(
        ctx.userId,
        ctx.courseId,
        "pending_followup",
        ctx.sessionNumber,
        followupLimit,
    );

    followups.forEach((q) => {
        if (!usedIds.has(q.question_id)) {
            queue.push({
                chunkId: q.questions.chunk_id || "",
                questionId: q.question_id,
                courseId: ctx.courseId,
                status: "pending_followup",
                priority: 1,
            });
            usedIds.add(q.question_id);
        }
    });

    // 1b. New Follow-ups (Newly generated parents)
    const remainingFollowup = followupLimit - queue.length;
    if (remainingFollowup > 0) {
        const newFollowups = await Repository.fetchNewFollowups(
            ctx.courseId,
            remainingFollowup,
        );
        newFollowups.forEach((q) => {
            if (!usedIds.has(q.id)) {
                queue.push({
                    chunkId: q.chunk_id || "",
                    questionId: q.id,
                    courseId: ctx.courseId,
                    status: "pending_followup",
                    priority: 1,
                });
                usedIds.add(q.id);
            }
        });
    }

    // --- 2. Training Pool (Waterfall Model - Target: 70%) ---
    const trainingLimit = Math.ceil(limit * 0.7);

    let effectiveChunkId = targetChunkId;
    if (targetChunkId) {
        DebugLogger.process(
            `Waterfall: User intent detected for chunk ${targetChunkId}`,
        );
    } else {
        // Fallback: Automatic frontier detection based on last activity
        effectiveChunkId =
            (await Repository.getFrontierChunkId(ctx.userId, ctx.courseId)) ||
            undefined;
    }

    if (effectiveChunkId) {
        const trainingQs = await Repository.fetchWaterfallTrainingQuestions(
            ctx.userId,
            ctx.courseId,
            effectiveChunkId,
            trainingLimit,
        );

        trainingQs.forEach((q) => {
            if (!usedIds.has(q.question_id)) {
                queue.push({
                    chunkId: q.questions.chunk_id || "",
                    questionId: q.question_id,
                    courseId: ctx.courseId,
                    status: "active",
                    priority: 2,
                });
                usedIds.add(q.question_id);
            }
        });
    }

    // Fallback Training: If waterfall couldn't fill the quota, use generic active search
    const remainingTrainingQuota = Math.max(0, followupLimit + trainingLimit) -
        queue.length;
    if (remainingTrainingQuota > 0) {
        const fallbackQs = await Repository.fetchQuestionsByStatus(
            ctx.userId,
            ctx.courseId,
            "active",
            null,
            remainingTrainingQuota,
        );
        fallbackQs.forEach((q) => {
            if (!usedIds.has(q.question_id)) {
                queue.push({
                    chunkId: q.questions.chunk_id || "",
                    questionId: q.question_id,
                    courseId: ctx.courseId,
                    status: "active",
                    priority: 2,
                });
                usedIds.add(q.question_id);
            }
        });
    }

    // --- 3. Archive Mechanism (Target: 10%) ---
    const archiveTarget = Math.ceil(limit * 0.1);
    const currentRemaining = limit - queue.length;

    if (currentRemaining > 0) {
        const archiveQs = await Repository.fetchQuestionsByStatus(
            ctx.userId,
            ctx.courseId,
            "archived",
            ctx.sessionNumber,
            Math.min(currentRemaining, archiveTarget),
        );

        archiveQs.forEach((q) => {
            if (!usedIds.has(q.question_id)) {
                queue.push({
                    chunkId: q.questions.chunk_id || "",
                    questionId: q.question_id,
                    courseId: ctx.courseId,
                    status: "archived",
                    priority: 3,
                });
                usedIds.add(q.question_id);
            }
        });
    }

    DebugLogger.groupEnd();
    return queue.slice(0, limit);
}
