import { describe, it, expect } from 'vitest';
import {
  calculateShelfStatus,
  calculateQuestionWeights,
  calculateNextReviewSession,
} from '@/features/quiz/logic/srsLogic';
import type { ExamDistributionInput } from '@/features/quiz/types';

describe('srsLogic - calculateShelfStatus', () => {
  it('yavaş çözümle 2.5 iken 3.0 olup archived durumuna geçer', () => {
    const result = calculateShelfStatus(2.5, true, false);
    expect(result.newStatus).toBe('archived');
    expect(result.newSuccessCount).toBe(3.0);
  });

  it('hızlı çözümle 2.5 iken 3.5 olup archived durumuna geçer', () => {
    const result = calculateShelfStatus(2.5, true, true);
    expect(result.newStatus).toBe('archived');
    expect(result.newSuccessCount).toBe(3.5);
  });

  it('yanlış cevapta streak sıfırlanır ve pending_followup olur', () => {
    const result = calculateShelfStatus(2.5, false, false);
    expect(result.newStatus).toBe('pending_followup');
    expect(result.newSuccessCount).toBe(0);
  });

  it('0.5+ başarı ile pending_followup olur', () => {
    const result = calculateShelfStatus(0, true, false);
    expect(result.newStatus).toBe('pending_followup');
    expect(result.newSuccessCount).toBe(0.5);
  });

  it('başlangıçta active durumda olur', () => {
    const result = calculateShelfStatus(0, true, false);
    expect(result.newStatus).toBe('pending_followup');
  });
});

describe('srsLogic - calculateQuestionWeights', () => {
  it('boş chunks dizisi gelirse boş Map döner', () => {
    const input: ExamDistributionInput = {
      examTotal: 10,
      importance: 'medium',
      chunks: [],
    };
    const result = calculateQuestionWeights(input);
    expect(result.size).toBe(0);
  });

  it('tüm mastery 100 ise eşit dağılım yapar (totalWeight=0 yolu)', () => {
    const input: ExamDistributionInput = {
      examTotal: 10,
      importance: 'medium',
      chunks: [
        {
          id: 'chunk1',
          mastery_score: 100,
          concept_count: 1,
          difficulty_index: 3,
        },
        {
          id: 'chunk2',
          mastery_score: 100,
          concept_count: 1,
          difficulty_index: 3,
        },
      ],
    };
    const result = calculateQuestionWeights(input);
    expect(result.size).toBe(2);
    const values = Array.from(result.values());
    expect(values.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('normal dağılım testi', () => {
    const input: ExamDistributionInput = {
      examTotal: 10,
      importance: 'high',
      chunks: [
        {
          id: 'chunk1',
          mastery_score: 50,
          concept_count: 2,
          difficulty_index: 4,
        },
        {
          id: 'chunk2',
          mastery_score: 80,
          concept_count: 1,
          difficulty_index: 2,
        },
      ],
    };
    const result = calculateQuestionWeights(input);
    expect(result.size).toBe(2);
  });
});

describe('srsLogic - calculateNextReviewSession', () => {
  it('artarak ilerleyen oturumlar döner', () => {
    expect(calculateNextReviewSession(1, 1)).toBe(2);
    expect(calculateNextReviewSession(1, 2)).toBe(4);
    expect(calculateNextReviewSession(1, 3)).toBe(8);
    expect(calculateNextReviewSession(1, 4)).toBe(15);
    expect(calculateNextReviewSession(1, 5)).toBe(31);
  });

  it('0 başarıda minimum 1 olarak hesaplanır', () => {
    expect(calculateNextReviewSession(1, 0)).toBe(2);
  });
});
