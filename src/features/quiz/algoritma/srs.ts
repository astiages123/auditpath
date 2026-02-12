/**
 * SRS Algorithm Module (Pure Math)
 *
 * Implements "Shelf System" (Raf Sistemi) scoring and scheduling logic.
 * Independent of Database or State.
 */

import type { Database } from '@/shared/types/supabase';
import { type QuizResponseType } from '../core/types';

// --- Types ---
export type BloomLevel = Database['public']['Enums']['bloom_level'];

export interface ScoreChange {
  delta: number;
  newScore: number;
}

export interface AdvancedScoreResult {
  baseDelta: number;
  finalScore: number;
  bloomCoeff: number;
  timeRatio: number;
}

// --- Constants ---
const POINTS_CORRECT = 10;
const PENALTY_INCORRECT_FIRST = 5;
const PENALTY_BLANK_FIRST = 2;
const PENALTY_REPEATED = 10;
const SESSION_GAPS = [1, 2, 5, 10, 20];
const SLOW_SUCCESS_INCREMENT = 0.5;

const BLOOM_COEFFICIENTS: Record<BloomLevel, number> = {
  knowledge: 1.0,
  application: 1.3,
  analysis: 1.6,
};

const TARGET_TIMES_MS: Record<BloomLevel, number> = {
  knowledge: 20_000,
  application: 35_000,
  analysis: 50_000,
};

const DIFFICULTY_MULTIPLIERS: Record<BloomLevel, number> = {
  knowledge: 1.0,
  application: 1.2,
  analysis: 1.5,
};

/**
 * Calculates the new shelf status and success chain.
 * Implements the "3-Strike Rule" with 0.5 increment granularity.
 *
 * The 3-Strike Rule Logic:
 * - A question needs a total of 3.0 "success points" to be archived
 * - Fast correct answers (isFast=true) award 1.0 point
 * - Slow correct answers (isFast=false) award 0.5 points (SLOW_SUCCESS_INCREMENT)
 * - This means 3 fast corrects OR 6 slow corrects will archive a question
 *
 * Status Transition Rules:
 * - newSuccessCount >= 3.0: Status becomes "archived" (question mastered)
 * - newSuccessCount >= 0.5: Status becomes "pending_followup" (in review queue)
 * - newSuccessCount < 0.5: Status remains "active" (still being learned)
 * - Any incorrect answer: Reset to 0, status becomes "pending_followup"
 *
 * Example progression with slow answers only:
 *   Attempt 1: 0 + 0.5 = 0.5 → pending_followup
 *   Attempt 2: 0.5 + 0.5 = 1.0 → pending_followup
 *   Attempt 3: 1.0 + 0.5 = 1.5 → pending_followup
 *   Attempt 4: 1.5 + 0.5 = 2.0 → pending_followup
 *   Attempt 5: 2.0 + 0.5 = 2.5 → pending_followup
 *   Attempt 6: 2.5 + 0.5 = 3.0 → archived ✓
 */
export function calculateShelfStatus(
  consecutiveSuccess: number,
  isCorrect: boolean,
  isFast: boolean
): {
  newStatus: 'archived' | 'pending_followup' | 'active';
  newSuccessCount: number;
} {
  if (!isCorrect) {
    const newSuccessCount = 0;
    return { newStatus: 'pending_followup', newSuccessCount };
  }

  const increment = isFast ? 1.0 : SLOW_SUCCESS_INCREMENT;
  const newSuccessCount = consecutiveSuccess + increment;

  if (newSuccessCount >= 3) {
    return { newStatus: 'archived', newSuccessCount };
  } else if (newSuccessCount >= 0.5) {
    return { newStatus: 'pending_followup', newSuccessCount };
  }

  return { newStatus: 'active', newSuccessCount };
}

/**
 * Calculates the next review session number.
 * Guarantees a minimum gap of 1 session to prevent infinite loops
 * for new questions or slow success scenarios.
 */
export function calculateNextReviewSession(
  currentSession: number,
  successCount: number
): number {
  // Ensure minimum gap of 1 session (prevents infinite loops for successCount < 1)
  const adjustedSuccessCount = Math.max(1, successCount);
  const gapIndex = Math.floor(adjustedSuccessCount) - 1;
  const safeIndex = Math.max(0, Math.min(gapIndex, SESSION_GAPS.length - 1));

  const gap = SESSION_GAPS[safeIndex];
  return currentSession + gap;
}

/**
 * Calculates score change based on response type.
 */
export function calculateScoreChange(
  responseType: QuizResponseType,
  currentScore: number,
  isRepeated: boolean = false
): ScoreChange {
  let delta = 0;

  if (responseType === 'correct') {
    delta = POINTS_CORRECT;
  } else {
    if (isRepeated) {
      delta = -PENALTY_REPEATED;
    } else {
      if (responseType === 'incorrect') {
        delta = -PENALTY_INCORRECT_FIRST;
      } else if (responseType === 'blank') {
        delta = -PENALTY_BLANK_FIRST;
      }
    }
  }

  const newScore = Math.max(0, Math.min(100, currentScore + delta));

  return {
    delta,
    newScore,
  };
}

/**
 * Calculates advanced score with Bloom coefficients and time ratio.
 */
export function calculateAdvancedScore(
  deltaP: number,
  bloomLevel: BloomLevel,
  timeSpentMs: number
): AdvancedScoreResult {
  const bloomCoeff = BLOOM_COEFFICIENTS[bloomLevel];
  const tTarget = TARGET_TIMES_MS[bloomLevel];
  const tActual = Math.max(timeSpentMs, 1000);

  const timeRatio = Math.min(2.0, Math.max(0.5, tTarget / tActual));
  const rawFinal = deltaP * bloomCoeff * timeRatio;
  const finalScore = Math.round(rawFinal * 100) / 100;

  return {
    baseDelta: deltaP,
    finalScore,
    bloomCoeff,
    timeRatio: Math.round(timeRatio * 100) / 100,
  };
}

/**
 * Calculates dynamic Tmax threshold for "Fast" answer determination.
 * @returns Tmax in milliseconds
 */
export function calculateTMax(
  charCount: number,
  conceptCount: number,
  bloomLevel: BloomLevel,
  bufferSeconds: number = 10
): number {
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[bloomLevel] || 1.0;

  // Base reading time in seconds (Assuming 780 characters per minute ≈ 130 words per minute)
  const readingTimeSeconds = (charCount / 780) * 60;

  // Additional time for question complexity based on concepts
  const complexitySeconds = (15 + conceptCount * 2) * difficultyMultiplier;

  const tMaxSeconds = readingTimeSeconds + complexitySeconds + bufferSeconds;

  return Math.round(tMaxSeconds * 1000);
}
