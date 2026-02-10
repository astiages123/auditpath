import * as SRS from '../algoritma/srs';
import {
  type ChunkMetadata,
  type QuizResponseType,
  type SubmissionResult,
} from '../core/types';

/**
 * Pure logic for calculating quiz submission results.
 * This file contains no async operations or side effects.
 */

export function calculateQuizResult(
  currentStatus: {
    consecutive_success: number;
    consecutive_fails: number;
  } | null,
  responseType: QuizResponseType,
  timeSpentMs: number,
  questionData: {
    bloom_level: string | null;
    chunk_id: string | null;
  } | null,
  chunkMetadata: {
    word_count: number | null;
    metadata: ChunkMetadata | null;
  } | null,
  masteryData: {
    mastery_score: number;
  } | null,
  uniqueSolvedCount: number,
  totalChunkQuestions: number,
  sessionNumber: number // Added to support nextReviewSession calculation
): SubmissionResult {
  const isCorrect = responseType === 'correct';
  const isRepeated =
    (currentStatus?.consecutive_fails || 0) > 0 ||
    (currentStatus?.consecutive_success || 0) > 0;

  // 1. Determine if "Fast" (DTS)
  let isFast = timeSpentMs < 30000; // Fallback
  if (questionData && chunkMetadata) {
    const wordCount = chunkMetadata.word_count || 300;
    const metadata = chunkMetadata.metadata || {};
    const difficultyIndex =
      metadata.difficulty_index ?? metadata.density_score ?? 3;

    // densityCoeff mapping: 1->1.2, 3->1.0, 5->0.8
    const densityCoeff = 1.3 - difficultyIndex * 0.1;

    const bloomLevel =
      (questionData.bloom_level as SRS.BloomLevel) || 'knowledge';
    const tMaxMs = SRS.calculateTMax(wordCount, densityCoeff, bloomLevel);

    isFast = timeSpentMs <= tMaxMs;
  }

  // 2. Shelf Algorithm (SRS)
  const srsResult = SRS.calculateShelfStatus(
    currentStatus?.consecutive_success || 0,
    isCorrect,
    isFast
  );

  const nextReviewSession =
    srsResult.newStatus === 'pending_followup' ||
    srsResult.newStatus === 'archived'
      ? SRS.calculateNextReviewSession(sessionNumber, srsResult.newSuccessCount)
      : null;

  // 3. Score calculation
  const previousMastery = masteryData?.mastery_score || 0;
  const scoreChange = SRS.calculateScoreChange(
    responseType,
    previousMastery,
    isRepeated
  );
  const scoreDelta = scoreChange.delta;

  // 4. Mastery Calculation (Coverage + SRS)
  // coveragePercentage is uniqueSolved / totalChunkQuestions
  // Note: uniqueSolved should ALREADY include this current attempt if it was unique
  // But engine.ts calls getUniqueSolvedCountInChunk BEFORE recording progress?
  // Let's check engine.ts:
  // uniqueSolved = await Repository.getUniqueSolvedCountInChunk(ctx.userId, chunkId);
  // So if it was not solved before and now it is correct, we should maybe add 1?
  // Actually, engine.ts logic was:
  // const uniqueSolved = await Repository.getUniqueSolvedCountInChunk(ctx.userId, chunkId);
  // const coverageRatio = Math.min(1, uniqueSolved / totalQuestions);
  // This value is used for finalScore.

  const coverageRatio =
    totalChunkQuestions > 0
      ? Math.min(1, uniqueSolvedCount / totalChunkQuestions)
      : 0;
  const coverageScore = coverageRatio * 60;
  const newMastery = Math.round(coverageScore + scoreChange.newScore * 0.4);

  const isTopicRefreshed =
    totalChunkQuestions > 0 && uniqueSolvedCount / totalChunkQuestions >= 0.8;

  const newFailsCount = isCorrect
    ? 0
    : (currentStatus?.consecutive_fails || 0) + 1;

  return {
    isCorrect,
    scoreDelta,
    newMastery,
    newStatus: srsResult.newStatus,
    nextReviewSession,
    isTopicRefreshed,
    newSuccessCount: srsResult.newSuccessCount,
    newFailsCount,
  };
}
