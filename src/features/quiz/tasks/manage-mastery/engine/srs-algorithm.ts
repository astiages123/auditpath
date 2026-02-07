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
const SESSION_GAPS = [1, 2, 5, 10, 20]; // 1. başarıdan sonra +1 seans, 2. den sonra +2 seans...
const SLOW_SUCCESS_INCREMENT = 0.5;

// --- Bloom Coefficients ---
const BLOOM_COEFFICIENTS: Record<BloomLevel, number> = {
  knowledge: 1.0,
  application: 1.3,
  analysis: 1.6,
};

// --- Target Times (ms) ---
const TARGET_TIMES_MS: Record<BloomLevel, number> = {
  knowledge: 20_000,
  application: 35_000,
  analysis: 50_000,
};

// --- Core Functions ---

/**
 * Bir sorunun yeni durumunu ve başarı zincirini belirler.
 * Raf Sistemi (Shelf System) - 3-Strike Rule
 */
export function calculateShelfStatus(
  consecutiveSuccess: number,
  isCorrect: boolean,
  isFast: boolean,
): {
  newStatus: "archived" | "pending_followup" | "active";
  newSuccessCount: number;
} {
  if (!isCorrect) {
    // Hata varsa zincir sıfırlanır, soru "active" döner.
    return { newStatus: "active", newSuccessCount: 0 };
  }

  // Doğru cevap: Hızlı mı Yavaş mı?
  // isFast -> +1.0
  // !isFast -> +0.5 (Slow Success Increment)
  const increment = isFast ? 1.0 : SLOW_SUCCESS_INCREMENT;
  const newSuccessCount = consecutiveSuccess + increment;

  if (newSuccessCount >= 3) {
    // 3 veya üzeri tam puan: MEZUNİYET (Rafa kaldır)
    return { newStatus: "archived", newSuccessCount };
  } else if (newSuccessCount >= 0.5) {
    // En az 0.5 puan (ilk yavaş doğru veya daha fazlası): Takip aşaması
    return { newStatus: "pending_followup", newSuccessCount };
  }

  // Teorik olarak buraya düşmemeli çünkü doğru cevap en az +0.5 ekler
  // ve newSuccessCount >= 0.5 olur. Ancak güvenlik için:
  return { newStatus: "active", newSuccessCount };
}

/**
 * Bir sonraki tekrarın hangi seans numarasında olacağını hesaplar.
 */
export function calculateNextReviewSession(
  currentSession: number,
  successCount: number,
): number {
  // successCount ondalıklı olabilir (örn: 0.5, 1.5, 2.5)
  // Math.floor ile tam sayı kısmını alıyoruz.
  // 0.5 -> index 0 (gap 1) -> "İlk yavaş doğru" için varsayılan 1 seans gap
  // 1.0 -> index 0 (gap 1)
  // 1.5 -> index 1 (gap 2)
  // 2.0 -> index 1 (gap 2)
  // ...

  // Safe floor calculation & Index Mapping
  // Logic:
  // 0 <= count < 1  --> index 0 (Gap: 1)
  // 1 <= count < 2  --> index 0 (Gap: 1) ??
  // Wait, array mapping:
  // Index 0: Gap 1
  // Index 1: Gap 2
  // Index 2: Gap 5
  // ...
  //
  // If successCount is 0.5 (Slow Success), we want Gap 1.
  // If successCount is 1.0 (Fast Success), we want Gap 1.
  // If successCount is 1.5, we want Gap 2? Or Gap 1?
  // Usually SRS escalates.
  // Let's use standard index = floor(successCount) - 1 logic but handle 0.5 specially.

  let gapIndex = 0;

  if (successCount < 1) {
    // 0.5 gibi değerler için en küçük gap (1 seans)
    gapIndex = 0;
  } else {
    // 1.0 ve üzeri için: (1 -> index 0, 2 -> index 1, 3 -> index 2...)
    gapIndex = Math.floor(successCount) - 1;
  }

  // Clamp to array bounds
  const safeIndex = Math.max(
    0,
    Math.min(gapIndex, SESSION_GAPS.length - 1),
  );

  const gap = SESSION_GAPS[safeIndex];
  return currentSession + gap;
}

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
