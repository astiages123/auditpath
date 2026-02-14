import { describe, expect, it } from 'vitest';
import {
  calculateChunkMastery,
  calculateInitialResults,
  calculateMastery,
  calculateTestResults,
  isExcellenceAchieved,
  updateResults,
} from '@/features/quiz/lib/engine/scoring';
import type { QuizResults } from '@/features/quiz/core/types';

describe('scoring', () => {
  describe('calculateInitialResults', () => {
    it('should return zero values', () => {
      const result = calculateInitialResults();
      expect(result).toEqual({
        correct: 0,
        incorrect: 0,
        blank: 0,
        totalTimeMs: 0,
      });
    });
  });

  describe('updateResults', () => {
    it('should increment correct count', () => {
      const current: QuizResults = {
        correct: 0,
        incorrect: 0,
        blank: 0,
        totalTimeMs: 0,
      };
      const result = updateResults(current, 'correct', 5000);
      expect(result.correct).toBe(1);
      expect(result.totalTimeMs).toBe(5000);
    });

    it('should increment incorrect count', () => {
      const current: QuizResults = {
        correct: 0,
        incorrect: 0,
        blank: 0,
        totalTimeMs: 0,
      };
      const result = updateResults(current, 'incorrect', 3000);
      expect(result.incorrect).toBe(1);
      expect(result.totalTimeMs).toBe(3000);
    });

    it('should increment blank count', () => {
      const current: QuizResults = {
        correct: 5,
        incorrect: 2,
        blank: 1,
        totalTimeMs: 10000,
      };
      const result = updateResults(current, 'blank', 1000);
      expect(result.blank).toBe(2);
      expect(result.totalTimeMs).toBe(11000);
    });

    it('should accumulate time across updates', () => {
      const current: QuizResults = {
        correct: 1,
        incorrect: 0,
        blank: 0,
        totalTimeMs: 5000,
      };
      const result = updateResults(current, 'correct', 3000);
      expect(result.totalTimeMs).toBe(8000);
    });

    it('should return a new object (immutability)', () => {
      const current: QuizResults = {
        correct: 1,
        incorrect: 0,
        blank: 0,
        totalTimeMs: 5000,
      };
      const result = updateResults(current, 'correct', 3000);
      expect(result).not.toBe(current);
    });
  });

  describe('calculateMastery', () => {
    it('should return 0 when total is 0', () => {
      const results: QuizResults = {
        correct: 0,
        incorrect: 0,
        blank: 0,
        totalTimeMs: 0,
      };
      expect(calculateMastery(results, 0)).toBe(0);
    });

    it('should calculate 100% mastery', () => {
      const results: QuizResults = {
        correct: 10,
        incorrect: 0,
        blank: 0,
        totalTimeMs: 0,
      };
      expect(calculateMastery(results, 10)).toBe(100);
    });

    it('should calculate 50% mastery', () => {
      const results: QuizResults = {
        correct: 5,
        incorrect: 5,
        blank: 0,
        totalTimeMs: 0,
      };
      expect(calculateMastery(results, 10)).toBe(50);
    });

    it('should round to nearest integer', () => {
      const results: QuizResults = {
        correct: 1,
        incorrect: 2,
        blank: 0,
        totalTimeMs: 0,
      };
      expect(calculateMastery(results, 3)).toBe(33);
    });
  });

  describe('isExcellenceAchieved', () => {
    it('should return true when mastery >= 80', () => {
      const results: QuizResults = {
        correct: 8,
        incorrect: 2,
        blank: 0,
        totalTimeMs: 0,
      };
      expect(isExcellenceAchieved(results, 10)).toBe(true);
    });

    it('should return false when mastery < 80', () => {
      const results: QuizResults = {
        correct: 7,
        incorrect: 3,
        blank: 0,
        totalTimeMs: 0,
      };
      expect(isExcellenceAchieved(results, 10)).toBe(false);
    });

    it('should return false when total is 0', () => {
      const results: QuizResults = {
        correct: 0,
        incorrect: 0,
        blank: 0,
        totalTimeMs: 0,
      };
      expect(isExcellenceAchieved(results, 0)).toBe(false);
    });

    it('should return false when mastery is 79%', () => {
      const results: QuizResults = {
        correct: 79,
        incorrect: 21,
        blank: 0,
        totalTimeMs: 0,
      };
      expect(isExcellenceAchieved(results, 100)).toBe(false);
    });

    it('should return true when mastery is exactly 80% (threshold)', () => {
      const results: QuizResults = {
        correct: 80,
        incorrect: 20,
        blank: 0,
        totalTimeMs: 0,
      };
      expect(isExcellenceAchieved(results, 100)).toBe(true);
    });

    it('should return true when mastery is 81%', () => {
      const results: QuizResults = {
        correct: 81,
        incorrect: 19,
        blank: 0,
        totalTimeMs: 0,
      };
      expect(isExcellenceAchieved(results, 100)).toBe(true);
    });
  });

  describe('calculateTestResults', () => {
    it('should calculate all fields correctly', () => {
      const result = calculateTestResults(8, 2, 0, 60000);
      expect(result.percentage).toBe(80);
      expect(result.masteryScore).toBe(84);
      expect(result.pendingReview).toBe(2);
      expect(result.totalTimeFormatted).toBe('00:01:00');
    });

    it('should handle zero total', () => {
      const result = calculateTestResults(0, 0, 0, 0);
      expect(result.percentage).toBe(0);
      expect(result.masteryScore).toBe(0);
      expect(result.pendingReview).toBe(0);
      expect(result.totalTimeFormatted).toBe('00:00:00');
    });

    it('should calculate mastery score with incorrect weight', () => {
      const result = calculateTestResults(5, 5, 0, 60000);
      expect(result.percentage).toBe(50);
      expect(result.masteryScore).toBe(60);
    });

    it('should format time correctly for hours', () => {
      const result = calculateTestResults(0, 0, 0, 3661000);
      expect(result.totalTimeFormatted).toBe('01:01:01');
    });

    it('should pad minutes and seconds', () => {
      const result = calculateTestResults(0, 0, 0, 65000);
      expect(result.totalTimeFormatted).toBe('00:01:05');
    });

    it('should format 0 ms as 00:00:00', () => {
      const result = calculateTestResults(0, 0, 0, 0);
      expect(result.totalTimeFormatted).toBe('00:00:00');
    });

    it('should format 59 seconds correctly', () => {
      const result = calculateTestResults(0, 0, 0, 59000);
      expect(result.totalTimeFormatted).toBe('00:00:59');
    });

    it('should format 61 seconds correctly (1 minute + 1 second)', () => {
      const result = calculateTestResults(0, 0, 0, 61000);
      expect(result.totalTimeFormatted).toBe('00:01:01');
    });

    it('should format 1 hour correctly', () => {
      const result = calculateTestResults(0, 0, 0, 3600000);
      expect(result.totalTimeFormatted).toBe('01:00:00');
    });

    it('should format 25 hours correctly', () => {
      const result = calculateTestResults(
        0,
        0,
        0,
        25 * 3600000 + 30 * 60000 + 45 * 1000
      );
      expect(result.totalTimeFormatted).toBe('25:30:45');
    });

    it('should calculate mastery score with correct formula (correct * 1.0 + incorrect * 0.2)', () => {
      const result = calculateTestResults(8, 2, 0, 0);
      expect(result.percentage).toBe(80);
      const expectedMastery = Math.round(((8 * 1.0 + 2 * 0.2) / 10) * 100);
      expect(result.masteryScore).toBe(expectedMastery);
    });
  });

  describe('calculateChunkMastery', () => {
    it('should return 0 when totalQuestions is 0', () => {
      expect(calculateChunkMastery(0, 0, 50)).toBe(0);
    });

    it('should return max score when fully covered with perfect score', () => {
      const result = calculateChunkMastery(10, 10, 100);
      expect(result).toBe(100);
    });

    it('should calculate coverage ratio (max 60 points)', () => {
      const result = calculateChunkMastery(10, 5, 0);
      expect(result).toBe(30);
    });

    it('should cap coverage at 1', () => {
      const result = calculateChunkMastery(10, 20, 0);
      expect(result).toBe(60);
    });

    it('should add score component (max 40 points)', () => {
      const result = calculateChunkMastery(10, 10, 100);
      expect(result).toBe(100);
    });

    it('should combine coverage and score', () => {
      const result = calculateChunkMastery(10, 5, 50);
      expect(result).toBe(50);
    });

    it('should round result', () => {
      const result = calculateChunkMastery(3, 1, 33);
      expect(result).toBe(33);
    });

    it('should cap coverage at 1 when uniqueSolved > totalQuestions (Math.min control)', () => {
      const result = calculateChunkMastery(10, 100, 0);
      expect(result).toBe(60);
    });

    it('should calculate score component correctly (averageScore * 0.4)', () => {
      const result = calculateChunkMastery(10, 0, 50);
      const expectedScoreComponent = 50 * 0.4;
      expect(result).toBe(Math.round(expectedScoreComponent));
    });

    it('should maintain 60/40 ratio between coverage and score', () => {
      const result = calculateChunkMastery(10, 10, 50);
      const expectedCoverage = (10 / 10) * 60;
      const expectedScore = 50 * 0.4;
      expect(result).toBe(Math.round(expectedCoverage + expectedScore));
    });
  });
});
