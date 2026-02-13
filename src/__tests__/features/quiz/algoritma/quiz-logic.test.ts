import { describe, expect, it, vi } from 'vitest';
import {
  calculateQuestionWeights,
  type ChunkMetric,
  type ExamDistributionInput,
} from '@/features/quiz/algoritma/exam';
import {
  calculateMastery,
  calculateTestResults,
  updateResults,
} from '@/features/quiz/algoritma/scoring';
import {
  determineNodeStrategy,
  getSubjectStrategy,
} from '@/features/quiz/algoritma/strategy';

describe('Quiz Logic - Algorithm Layer Tests', () => {
  describe('Exam Distribution (exam.ts)', () => {
    it('should calculate weights correctly for normal input', () => {
      const chunks: ChunkMetric[] = [
        {
          id: '1',
          concept_count: 10,
          difficulty_index: 3,
          mastery_score: 50,
        },
        {
          id: '2',
          concept_count: 5,
          difficulty_index: 3,
          mastery_score: 80,
        },
      ];
      // Use Object.freeze to ensure immutability
      Object.freeze(chunks);
      chunks.forEach((c) => Object.freeze(c));

      const input: ExamDistributionInput = {
        examTotal: 10,
        importance: 'high',
        chunks: chunks as ChunkMetric[],
      };
      Object.freeze(input);

      const result = calculateQuestionWeights(input);

      expect(result.get('1')).toBeGreaterThan(result.get('2')!);

      let sum = 0;
      result.forEach((count) => (sum += count));
      expect(sum).toBe(10);
    });

    it('should return empty map for empty chunks list', () => {
      const input: ExamDistributionInput = {
        examTotal: 10,
        importance: 'medium',
        chunks: [],
      };
      Object.freeze(input);
      const result = calculateQuestionWeights(input);
      expect(result.size).toBe(0);
    });

    it('should maintain sum integrity with complex rounding (Sum Integrity Check)', () => {
      const chunks: ChunkMetric[] = [
        {
          id: '1',
          concept_count: 1,
          difficulty_index: 3,
          mastery_score: 90,
        },
        {
          id: '2',
          concept_count: 1,
          difficulty_index: 3,
          mastery_score: 90,
        },
        {
          id: '3',
          concept_count: 1,
          difficulty_index: 3,
          mastery_score: 90,
        },
      ];
      Object.freeze(chunks);
      chunks.forEach((c) => Object.freeze(c));

      const input: ExamDistributionInput = {
        examTotal: 10,
        importance: 'low',
        chunks: chunks as ChunkMetric[],
      };
      Object.freeze(input);

      const result = calculateQuestionWeights(input);

      let sum = 0;
      result.forEach((count) => (sum += count));
      expect(sum).toBe(10);
      expect(Array.from(result.values()).some((v) => v === 4)).toBe(true);
      expect(Array.from(result.values()).some((v) => v === 3)).toBe(true);
    });
  });

  describe('Scoring Engine (scoring.ts)', () => {
    // Table-driven tests for result calculation
    it.each([
      [10, 0, 0, 10000, 100, 100],
      [0, 10, 0, 10000, 0, 20], // incorrect * 0.2
      [0, 0, 10, 10000, 0, 0], // blank * 0
      [5, 5, 0, 10000, 50, 60], // (5*1.0 + 5*0.2) / 10 = 0.6 -> 60%
      [8, 2, 0, 5000, 80, 84], // (8*1.0 + 2*0.2) / 10 = 0.84 -> 84%
      [0, 0, 0, 0, 0, 0], // Edge Case: Division by zero
    ])(
      'should calculate results correctly: correct=%i, incorrect=%i, blank=%i',
      (correct, incorrect, blank, time, expPercent, expMastery) => {
        const results = calculateTestResults(correct, incorrect, blank, time);
        expect(results.percentage).toBe(expPercent);
        expect(results.masteryScore).toBe(expMastery);
      }
    );

    it('should return new object on updateResults (Immutability Check)', () => {
      const initial = {
        correct: 1,
        incorrect: 1,
        blank: 0,
        totalTimeMs: 1000,
      };
      Object.freeze(initial);

      const updated = updateResults(initial, 'correct', 500);

      expect(updated).not.toBe(initial);
      expect(updated.correct).toBe(2);
      expect(initial.correct).toBe(1);
    });

    it('should handle boundary mastery values', () => {
      expect(
        calculateMastery(
          {
            correct: 10,
            incorrect: 0,
            blank: 0,
            totalTimeMs: 0,
          },
          10
        )
      ).toBe(100);
      expect(
        calculateMastery(
          {
            correct: 0,
            incorrect: 10,
            blank: 0,
            totalTimeMs: 0,
          },
          10
        )
      ).toBe(0);
    });
  });

  describe('Strategy Selector (strategy.ts)', () => {
    it('should normalize subject names correctly (Robust Normalization)', () => {
      const strategies = [
        getSubjectStrategy('  Mikro İktisat '),
        getSubjectStrategy('MIKRO İKTİSAT'),
        getSubjectStrategy('mikro iktisat'),
        getSubjectStrategy('mİkro İktİsat'), // Turkish casing check
      ];

      strategies.forEach((s) => {
        expect(s?.importance).toBe('high');
      });
    });

    it('should handle Turkish specific casing (The "Turkish I" Problem)', () => {
      // Testing the robustness of the normalizer against TR character mapping
      const resultI = getSubjectStrategy('İş Hukuku');
      // "is-hukuku" is in the map
      const resulti = getSubjectStrategy('is hukuku');

      expect(resultI).toBeDefined();
      expect(resultI?.importance).toBe('low');
      expect(resulti?.importance).toBe('low');
    });

    it.each([
      [0, 'knowledge'],
      [1, 'knowledge'],
      [2, 'application'],
      [8, 'analysis'],
      [9, 'analysis'],
      [10, 'knowledge'], // Cycles back
    ])(
      'should determine Bloom level strategy correctly: index=%i',
      (index, expectedLevel) => {
        const strategy = determineNodeStrategy(
          index,
          undefined,
          'Mikro İktisat'
        );
        expect(strategy.bloomLevel).toBe(expectedLevel);
      }
    );

    it('should mock Math.random if randomness exists (Determinism Check)', () => {
      // Currently strategy.ts is deterministic (modulo based),
      // but we add this as a placeholder/guard for future changes.
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

      // If determineNodeStrategy used randomness, it would be tested here
      const strategy = determineNodeStrategy(0, undefined, 'Test');
      expect(strategy.bloomLevel).toBeDefined();

      spy.mockRestore();
    });
  });
});
