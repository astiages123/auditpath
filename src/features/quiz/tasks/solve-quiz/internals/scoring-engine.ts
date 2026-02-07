/**
 * Scoring Engine for Quiz
 */

import { QuizResults } from "../types";

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
    type: "correct" | "incorrect" | "blank",
    timeMs: number,
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

/**
 * Determines if the session deserves special feedback (e.g. confetti)
 */
export function isExcellenceAchieved(
    results: QuizResults,
    total: number,
): boolean {
    const mastery = calculateMastery(results, total);
    return mastery >= 80;
}
