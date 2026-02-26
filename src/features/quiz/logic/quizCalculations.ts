import type { Database } from '@/types/database.types';
import { type QuizResults, type TestResultSummary } from '../types';

export type BloomLevel = Database['public']['Enums']['bloom_level'];

export function calculateInitialResults(): QuizResults {
  return { correct: 0, incorrect: 0, blank: 0, totalTimeMs: 0 };
}

export function updateResults(
  currentResults: QuizResults,
  type: 'correct' | 'incorrect' | 'blank',
  timeMs: number
): QuizResults {
  return {
    ...currentResults,
    [type]: currentResults[type] + 1,
    totalTimeMs: currentResults.totalTimeMs + timeMs,
  };
}

export function calculateMastery(results: QuizResults, total: number): number {
  if (total === 0) return 0;
  return Math.round((results.correct / total) * 100);
}

export function calculateTestResults(
  correct: number,
  incorrect: number,
  blank: number,
  timeSpentMs: number
): TestResultSummary {
  const total = correct + incorrect + blank;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const masteryScore =
    total > 0
      ? Math.round(
          ((correct * 1.0 + incorrect * 0.2 + blank * 0.0) / total) * 100
        )
      : 0;
  const pendingReview = incorrect + blank;
  const seconds = Math.floor(timeSpentMs / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const h = Math.floor(m / 60);
  const mRemaining = m % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const totalTimeFormatted = `${pad(h)}:${pad(mRemaining)}:${pad(s)}`;

  return { percentage, masteryScore, pendingReview, totalTimeFormatted };
}

export function calculateQuotas(concepts: { length: number }): {
  antrenman: number;
  deneme: number;
} {
  const count = concepts.length;
  const antrenmanBase = Math.max(5, count);
  return {
    antrenman: antrenmanBase,
    deneme: Math.ceil(antrenmanBase * 0.2),
  };
}
