/**
 * SRS Algorithm Module (Refactored for Shelf System)
 *
 * Implements simplified scoring based on "Shelf System" (Raf Sistemi):
 * - Correct Answer: +10 Points
 * - First Incorrect: -5 Points
 * - First Blank: -2 Points
 * - Repeated Incorrect/Blank: -10 Points
 */

import type { Database } from '@/lib/types/supabase';
import { DebugLogger } from '../debug-logger';

// --- Types ---
export type QuizResponseType = Database['public']['Enums']['quiz_response_type'];

export interface ScoreChange {
  delta: number;
  newScore: number;
}

// --- Constants ---
const POINTS_CORRECT = 10;
const PENALTY_INCORRECT_FIRST = 5;
const PENALTY_BLANK_FIRST = 2;
const PENALTY_REPEATED = 10;

// --- Core Functions ---

/**
 * Calculate score change based on response type and state tracking
 */
export function calculateScoreChange(
  responseType: QuizResponseType,
  currentScore: number,
  isRepeated: boolean = false
): ScoreChange {
  DebugLogger.group('SRS Algorithm: Calculate Score Change', {
    responseType,
    currentScore,
    isRepeated
  });

  let delta = 0;

  if (responseType === 'correct') {
    // Correct Answer: Always +10
    delta = POINTS_CORRECT;
  } else {
    // Negative scenarios
    if (isRepeated) {
      // "Tekrarlı Hata/Boş": -10 puan
      delta = -PENALTY_REPEATED;
    } else {
      // First time errors
      if (responseType === 'incorrect') {
        // "Yanlış Cevap (İlk kez)": -5 puan
        delta = -PENALTY_INCORRECT_FIRST;
      } else if (responseType === 'blank') {
        // "İlk Boş Geçme": -2 puan
        delta = -PENALTY_BLANK_FIRST;
      }
    }
  }

  // Calculate new score (clamp to 0-100)
  const newScore = Math.max(0, Math.min(100, currentScore + delta));

  const result = {
    delta,
    newScore
  };

  DebugLogger.output('Final Calculation Result', result);
  DebugLogger.groupEnd();

  return result;
}

