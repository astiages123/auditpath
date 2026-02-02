/**
 * SRS Algorithm Module (Refactored for Shelf System)
 *
 * Implements simplified scoring based on "Shelf System" (Raf Sistemi):
 * - Correct Answer: +10 Points
 * - First Incorrect: -5 Points
 * - First Blank: -2 Points
 * - Repeated Incorrect/Blank: -10 Points
 *
 * Also includes Advanced Scoring for Bloom-weighted time-adjusted scores.
 */

import type { Database } from "@/shared/types/supabase";
import { DebugLogger } from "@/shared/lib/ui/debug-logger";

// --- Types ---
export type QuizResponseType =
  Database["public"]["Enums"]["quiz_response_type"];
export type BloomLevel = Database["public"]["Enums"]["bloom_level"];

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

// --- Bloom Coefficients ---
const BLOOM_COEFFICIENTS: Record<BloomLevel, number> = {
  knowledge: 1.0,
  application: 1.3,
  analysis: 1.6,
};

// --- Target Times (ms) ---
const TARGET_TIMES_MS: Record<BloomLevel, number> = {
  knowledge: 20_000, // 20 saniye
  application: 35_000, // 35 saniye
  analysis: 50_000, // 50 saniye
};

// --- SRS Intervals ---
const BASE_REVIEW_INTERVAL_DAYS = 7;

// --- Core Functions ---

/**
 * Calculate score change based on response type and state tracking (Basic Shelf System)
 */
export function calculateScoreChange(
  responseType: QuizResponseType,
  currentScore: number,
  isRepeated: boolean = false,
): ScoreChange {
  DebugLogger.group("SRS Algorithm: Calculate Score Change", {
    responseType,
    currentScore,
    isRepeated,
  });

  let delta = 0;

  if (responseType === "correct") {
    // Correct Answer: Always +10
    delta = POINTS_CORRECT;
  } else {
    // Negative scenarios
    if (isRepeated) {
      // "Tekrarlı Hata/Boş": -10 puan
      delta = -PENALTY_REPEATED;
    } else {
      // First time errors
      if (responseType === "incorrect") {
        // "Yanlış Cevap (İlk kez)": -5 puan
        delta = -PENALTY_INCORRECT_FIRST;
      } else if (responseType === "blank") {
        // "İlk Boş Geçme": -2 puan
        delta = -PENALTY_BLANK_FIRST;
      }
    }
  }

  // Calculate new score (clamp to 0-100)
  const newScore = Math.max(0, Math.min(100, currentScore + delta));

  const result = {
    delta,
    newScore,
  };

  DebugLogger.output("Final Calculation Result", result);
  DebugLogger.groupEnd();

  return result;
}

/**
 * Calculate advanced score with Bloom coefficients and time ratio
 * Formula: S_final = Delta_P * Bloom_Coeff * (T_target / T_actual)
 *
 * @param deltaP - Base score change from shelf system (-10 to +10)
 * @param bloomLevel - Question's Bloom taxonomy level
 * @param timeSpentMs - Actual time spent (T_actual) from QuizEngine
 * @returns Advanced score result with all components
 */
export function calculateAdvancedScore(
  deltaP: number,
  bloomLevel: BloomLevel,
  timeSpentMs: number,
): AdvancedScoreResult {
  DebugLogger.group("SRS Algorithm: Advanced Score", {
    deltaP,
    bloomLevel,
    timeSpentMs,
  });

  const bloomCoeff = BLOOM_COEFFICIENTS[bloomLevel];
  const tTarget = TARGET_TIMES_MS[bloomLevel];

  // Clamp T_actual to minimum 1 second to avoid division issues
  const tActual = Math.max(timeSpentMs, 1000);

  // Calculate time ratio, clamped between 0.5 and 2.0
  // Faster than target = bonus (ratio > 1), slower = penalty (ratio < 1)
  const timeRatio = Math.min(2.0, Math.max(0.5, tTarget / tActual));

  // Final formula: S_final = Delta_P * Bloom_Coeff * (T_target / T_actual)
  const rawFinal = deltaP * bloomCoeff * timeRatio;
  const finalScore = Math.round(rawFinal * 100) / 100;

  const result: AdvancedScoreResult = {
    baseDelta: deltaP,
    finalScore,
    bloomCoeff,
    timeRatio: Math.round(timeRatio * 100) / 100,
  };

  DebugLogger.output("Advanced Score Result", result);
  DebugLogger.groupEnd();

  return result;
}

/**
 * Calculate Resilience Bonus for Aging (Mastery Chains)
 *
 * If a concept is part of a "Mastery Chain" (Kırılmaz Zincir), it gets a 40% bonus
 * to its "aging" duration (concepts collect dust slower).
 *
 * @param isPartOfChain - Whether the concept is part of a completed mastery chain
 * @returns Multiplier for aging duration (e.g. 1.4 for bonus, 1.0 for standard)
 */
export function calculateResilienceBonus(isPartOfChain: boolean): number {
  if (isPartOfChain) {
    return 1.4; // %40 Bonus
  }
  return 1.0;
}
/**
 * Calculate Next Review Date
 *
 * Determines when the question should reappear in the review queue.
 * Final Interval = Base Interval (7d) * Resilience Bonus (1.4x if chain)
 *
 * @param bonus - Resilience bonus multiplier (default 1.0)
 * @returns Date object for the next review
 */
export function calculateNextReview(bonus: number = 1.0): Date {
  const nextDate = new Date();
  const totalDays = BASE_REVIEW_INTERVAL_DAYS * bonus;

  // Add partial days by converting to milliseconds for precision
  const msToAdd = totalDays * 24 * 60 * 60 * 1000;
  nextDate.setTime(nextDate.getTime() + msToAdd);

  return nextDate;
}

/**
 * Calculate Overdue Penalty for Shelf System
 *
 * Formula: P_final = P_shelf - max(0, floor(T_overdue / 7) * 2)
 *
 * @param currentShelfScore - Current Shelf Score (P_shelf)
 * @param overdueDays - Number of days past due (T_overdue)
 * @returns Final score after penalty (P_final)
 */
export function calculateOverduePenalty(
  currentShelfScore: number,
  overdueDays: number,
): number {
  if (overdueDays <= 0) {
    return currentShelfScore;
  }

  const penaltyPoints = Math.floor(overdueDays / 7) * 2;
  const penalty = Math.max(0, penaltyPoints);

  // Apply penalty
  // We don't clamp to 0 here because the requirement says "not permanent",
  // so we might want to see the negative impact or just clamped 0.
  // "P_final = P_shelf - ..." suggests it could go lower, but logic dictates a score minimal 0 usually.
  // Let's assume clamping to 0 is safer for display/mastery.
  // The user prompt says: P_final = P_shelf - ...

  return Math.max(0, currentShelfScore - penalty);
}
