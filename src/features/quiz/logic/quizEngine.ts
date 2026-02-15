/**
 * Quiz Engine (Orchestrator Layer)
 *
 * Orchestrates the quiz flow by coordinating:
 * - Repository (Data Access)
 * - Algorithms (Pure Logic)
 * - Factory (Content Generation)
 */

import * as Repository from "@/features/quiz/services/quizRepository";

import { DebugLogger } from "./quizUtils";
import {
  type QuizResponseType,
  type ReviewItem,
  type SubmissionResult,
} from "@/features/quiz/types";
import {
  calculateQuestionWeights,
  type ChunkMetric,
} from "@/features/quiz/logic";
import { type GenerationLog, QuizFactory } from "./quizFactory";
import { calculateQuizResult } from "@/features/quiz/logic";

import { parseOrThrow } from "@/utils/helpers";
import { ChunkMetadataSchema } from "@/features/quiz/types";
import { logger } from "@/utils/logger";

// --- Types ---

export interface SessionContext {
  userId: string;
  courseId: string;
  courseName?: string;
  sessionNumber: number;
  isNewSession: boolean;
}

// --- Session Management ---

export async function startSession(
  userId: string,
  courseId: string,
): Promise<SessionContext> {
  const sessionInfo = await Repository.incrementCourseSession(userId, courseId);
  const courseName = await Repository.getCourseName(courseId);

  if (!sessionInfo.data) {
    throw new Error(sessionInfo.error?.message || "Failed to start session");
  }

  return {
    userId,
    courseId,
    courseName: courseName || "",
    sessionNumber: sessionInfo.data.current_session,
    isNewSession: sessionInfo.data.is_new_session,
  };
}

// --- Review Queue Logic (7-2-1 Rule & Waterfall) ---

/**
 * Generates the review queue for the current session.
 *
 * Strategy:
 * 1. Follow-up Pool (High Priority): Pending items from previous sessions.
 * 2. Training Pool (Medium Priority): Active questions from current/recent chunks.
 * 3. Archive Mechanism (Low Priority): Re-asking mastered topics (Archive Refresh).
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

// --- Interaction Logic ---

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
        Repository.getUniqueSolvedCountInChunk(ctx.userId, targetChunkId),
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
        metadata: parseOrThrow(ChunkMetadataSchema, chunkMetadata.metadata),
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

// --- Exam Service ---

export class ExamService {
  static async generateSmartExam(
    courseId: string,
    courseName: string,
    userId: string,
    callbacks: {
      onLog: (log: GenerationLog) => void;
      onQuestionSaved: (count: number) => void;
      onComplete: () => void;
      onError: (err: Error) => void;
    },
  ): Promise<{ success: boolean; questionIds: string[] }> {
    const factory = new QuizFactory();
    const EXAM_TOTAL = 20;

    try {
      // 1. Fetch data
      callbacks.onLog({
        id: crypto.randomUUID(),
        step: "INIT",
        message: "Ders verileri analiz ediliyor...",
        details: {},
        timestamp: new Date(),
      });

      const [chunks] = await Promise.all([
        Repository.fetchCourseChunks(courseId),
        Repository.fetchPrerequisiteQuestions(courseId, [], 0), // Not actually needed for SAK?
        // Wait, I need mastery data matched with chunks
      ]);

      const masteryRows = await Repository.fetchCourseMastery(courseId, userId);
      const masteryMap = new Map(
        masteryRows.map((m) => [m.chunk_id, m.mastery_score]),
      );

      const metrics: ChunkMetric[] = chunks.map((c) => ({
        id: c.id,
        concept_count:
          parseOrThrow(ChunkMetadataSchema, c.metadata).concept_map?.length ||
          5,
        difficulty_index: parseOrThrow(ChunkMetadataSchema, c.metadata)
          .difficulty_index || 3,
        mastery_score: masteryMap.get(c.id) || 0,
      }));

      // 2. Calculate distribution
      const weights = calculateQuestionWeights({
        examTotal: EXAM_TOTAL,
        importance: "medium", // Default or fetch from course
        chunks: metrics,
      });

      const questionIds: string[] = [];
      let totalSaved = 0;

      // 3. Process each chunk
      for (const [chunkId, count] of weights.entries()) {
        if (count <= 0) continue;

        const existingDeneme = await Repository.fetchGeneratedQuestions(
          chunkId,
          "deneme",
          count,
        );

        if (existingDeneme.length < count) {
          callbacks.onLog({
            id: crypto.randomUUID(),
            step: "GENERATING",
            message: `Eksik sorular havuzdan tamamlanıyor: ${chunkId}`,
            details: {
              target: count,
              existing: existingDeneme.length,
            },
            timestamp: new Date(),
          });

          await factory.generateForChunk(
            chunkId,
            {
              onLog: callbacks.onLog,
              onQuestionSaved: () => {
                totalSaved++;
                callbacks.onQuestionSaved(totalSaved);
              },
              onComplete: () => {},
              onError: (err: unknown) => {
                throw new Error(String(err));
              },
            },
            {
              usageType: "deneme",
              targetCount: count - existingDeneme.length,
            },
          );
        }

        // Final fetch after potential generation
        const finalQs = await Repository.fetchGeneratedQuestions(
          chunkId,
          "deneme",
          count,
        );
        finalQs.forEach((q) => questionIds.push(q.id));
      }

      callbacks.onComplete();
      return {
        success: true,
        questionIds: questionIds.slice(0, EXAM_TOTAL),
      };
    } catch (error: unknown) {
      callbacks.onError(
        error instanceof Error ? error : new Error(String(error)),
      );
      return { success: false, questionIds: [] };
    }
  }

  static async fetchSmartExamFromPool(
    courseId: string,
    userId: string,
  ): Promise<{ success: boolean; questionIds: string[] } | null> {
    const EXAM_TOTAL = 20;

    try {
      const chunks = await Repository.fetchCourseChunks(courseId);
      const masteryRows = await Repository.fetchCourseMastery(courseId, userId);
      const masteryMap = new Map(
        masteryRows.map((m) => [m.chunk_id, m.mastery_score]),
      );

      const metrics: ChunkMetric[] = chunks.map((c) => ({
        id: c.id,
        concept_count:
          parseOrThrow(ChunkMetadataSchema, c.metadata).concept_map?.length ||
          5,
        difficulty_index: parseOrThrow(ChunkMetadataSchema, c.metadata)
          .difficulty_index || 3,
        mastery_score: masteryMap.get(c.id) || 0,
      }));

      const weights = calculateQuestionWeights({
        examTotal: EXAM_TOTAL,
        importance: "medium",
        chunks: metrics,
      });

      const questionIds: string[] = [];
      for (const [chunkId, count] of weights.entries()) {
        if (count <= 0) continue;

        const existingDeneme = await Repository.fetchGeneratedQuestions(
          chunkId,
          "deneme",
          count,
        );

        if (existingDeneme.length < count) {
          // Pool insufficient for SAK balance
          return null;
        }
        existingDeneme.forEach((q) => questionIds.push(q.id));
      }

      return {
        success: true,
        questionIds: questionIds.slice(0, EXAM_TOTAL),
      };
    } catch (error) {
      logger.error("Pool fetch error:", error as Error);
      return null;
    }
  }
}

// --- UI Helpers ---

/**
 * Refreshes archived questions in a batch by checking the pool or generating new ones via JIT.
 * Pure business logic service.
 */
export async function refreshArchivedQuestions(
  items: { questionId: string; status: string }[],
  chunkId: string | null,
): Promise<string[]> {
  const needsRefresh = items.some((i) => i.status === "archived");

  if (!needsRefresh) {
    return items.map((i) => i.questionId);
  }

  const promises = items.map(async (item) => {
    if (item.status === "archived" && chunkId) {
      try {
        // 1. Try to fetch from Pool
        const pooledQs = await Repository.fetchGeneratedQuestions(
          chunkId,
          "arsiv",
          5,
        );

        if (pooledQs.length > 0) {
          // Select a random one from pool
          const randomQ = pooledQs[Math.floor(Math.random() * pooledQs.length)];
          return randomQ.id; // Return new ID
        }

        // 2. Fallback to JIT generation
        const factory = new QuizFactory();
        const newId = await factory.generateArchiveRefresh(
          chunkId,
          item.questionId,
        );
        if (newId) {
          return newId; // Return new ID
        }
      } catch (e) {
        logger.error("Archive refresh failed", e as Error);
      }
    }
    return item.questionId; // Fallback to original
  });

  const results = await Promise.all(promises);
  return results;
}

export async function checkAndTriggerBackgroundGeneration(
  chunkId: string,
  _incorrectIds: string[],
): Promise<void> {
  const factory = new QuizFactory();
  try {
    await factory.generateForChunk(
      chunkId,
      {
        onLog: () => {},
        onQuestionSaved: () => {},
        onComplete: () => {},
        onError: (err: unknown) =>
          logger.error("Background gen error", { error: String(err) }),
      },
      {
        usageType: "antrenman",
        targetCount: 5, // Top up buffer,
      },
    );
  } catch (e) {
    logger.error("Failed to trigger background generation", e as Error);
  }
}
