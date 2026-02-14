/**
 * Scoring Engine for Quiz - Pure Math
 */

// Define QuizResults here to avoid dependency on global types if they are not pure
// But likely QuizResults is a shared type. For "Pure Math", we can redefine or import type.
// Assuming "types" is a shared/safe import.
import { QuizResults, TestResultSummary } from '@/features/quiz/core/types';

export function calculateInitialResults(): QuizResults {
  return {
    correct: 0,
    incorrect: 0,
    blank: 0,
    totalTimeMs: 0,
  };
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

export function isExcellenceAchieved(
  results: QuizResults,
  total: number
): boolean {
  const mastery = calculateMastery(results, total);
  return mastery >= 80;
}

export function calculateTestResults(
  correct: number,
  incorrect: number,
  blank: number,
  timeSpentMs: number
): TestResultSummary {
  const total = correct + incorrect + blank;

  // 1. Percentage
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  // 2. Mastery Score (Session) - Simple weighted average for session summary
  const masteryScore =
    total > 0
      ? Math.round(
          ((correct * 1.0 + incorrect * 0.2 + blank * 0.0) / total) * 100
        )
      : 0;

  // 3. Pending Review
  const pendingReview = incorrect + blank;

  // 4. Formatted Time
  const seconds = Math.floor(timeSpentMs / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const h = Math.floor(m / 60);
  const mRemaining = m % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const totalTimeFormatted = `${pad(h)}:${pad(mRemaining)}:${pad(s)}`;

  return {
    percentage,
    masteryScore,
    pendingReview,
    totalTimeFormatted,
  };
}

export function calculateChunkMastery(
  totalQuestions: number,
  uniqueSolved: number,
  averageScore: number
): number {
  if (totalQuestions === 0) return 0;

  // Coverage Ratio (0 to 1)
  const coverageRatio = Math.min(1, uniqueSolved / totalQuestions);
  const coverageScore = coverageRatio * 60; // Max 60 points from coverage

  // Score Component (Max 40 points)
  const scoreComponent = averageScore * 0.4;

  return Math.round(coverageScore + scoreComponent);
}
