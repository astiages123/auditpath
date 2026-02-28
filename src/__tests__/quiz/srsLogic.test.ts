import { describe, expect, it } from 'vitest';
import {
  calculateNextSession,
  calculateQuizResult,
  calculateRepResult,
  calculateScoreChange,
} from '../../features/quiz/logic/srsLogic';

describe('srsLogic - Testleri', () => {
  describe('calculateRepResult', () => {
    it('1. Doğru cevap verildiğinde rep_count artar (max 3)', () => {
      expect(calculateRepResult(0, true)).toEqual({
        newRepCount: 1,
        newStatus: 'reviewing',
      });
      expect(calculateRepResult(1, true)).toEqual({
        newRepCount: 2,
        newStatus: 'reviewing',
      });
      expect(calculateRepResult(2, true)).toEqual({
        newRepCount: 3,
        newStatus: 'mastered',
      });
      expect(calculateRepResult(3, true)).toEqual({
        newRepCount: 3,
        newStatus: 'mastered',
      });
    });

    it('2. Yanlış cevap verildiğinde rep_count azalır (min 0)', () => {
      expect(calculateRepResult(3, false)).toEqual({
        newRepCount: 2,
        newStatus: 'reviewing',
      });
      expect(calculateRepResult(2, false)).toEqual({
        newRepCount: 1,
        newStatus: 'reviewing',
      });
      expect(calculateRepResult(1, false)).toEqual({
        newRepCount: 0,
        newStatus: 'active',
      });
      expect(calculateRepResult(0, false)).toEqual({
        newRepCount: 0,
        newStatus: 'active',
      });
    });
  });

  describe('calculateNextSession', () => {
    it('3. Rep sayısına göre bir sonraki oturum aralığını doğru hesaplar', () => {
      // gaps = [0, 1, 2, 5, 5]
      expect(calculateNextSession(10, 0)).toBe(10); // rep 0 -> +0
      expect(calculateNextSession(10, 1)).toBe(11); // rep 1 -> +1
      expect(calculateNextSession(10, 2)).toBe(12); // rep 2 -> +2
      expect(calculateNextSession(10, 3)).toBe(15); // rep 3 -> +5
    });
  });

  describe('calculateScoreChange', () => {
    it('4. Skor değişimlerini (correct/incorrect/blank) doğru uygular', () => {
      expect(calculateScoreChange('correct', 50)).toEqual({
        delta: 10,
        newScore: 60,
      });
      expect(calculateScoreChange('incorrect', 50)).toEqual({
        delta: -5,
        newScore: 45,
      });
      expect(calculateScoreChange('blank', 50)).toEqual({
        delta: -2,
        newScore: 48,
      });
    });

    it('5. Skor 0 ve 100 arasında kalır (clamping)', () => {
      expect(calculateScoreChange('correct', 95).newScore).toBe(100);
      expect(calculateScoreChange('incorrect', 3).newScore).toBe(0);
    });
  });

  describe('calculateQuizResult', () => {
    it('6. SRS ve Skor sonuçlarını birleştirerek SubmissionResult döner', () => {
      const result = calculateQuizResult({ rep_count: 1 }, 'correct', 50, 10);

      expect(result).toEqual({
        isCorrect: true,
        scoreDelta: 10,
        newMastery: 60,
        newStatus: 'reviewing',
        nextReviewSession: 12, // 10 + gap(2)
        newRepCount: 2,
      });
    });

    it('7. Status null ise rep_count 0 kabul edilerek sonuç üretilir', () => {
      const result = calculateQuizResult(null, 'correct', 0, 1);
      expect(result.newRepCount).toBe(1);
      expect(result.newStatus).toBe('reviewing');
    });
  });
});
