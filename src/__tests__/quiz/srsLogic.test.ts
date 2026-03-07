import { describe, expect, it } from 'vitest';
import {
  calculateAggregateMastery,
  calculateNextRepCount,
  calculateNextSession,
  calculateQuizResult,
  calculateScoreChange,
} from '../../features/quiz/logic/srsLogic';

describe('srsLogic - Testleri', () => {
  describe('calculateNextRepCount', () => {
    it('1. Doğru cevap verildiğinde rep_count artar', () => {
      expect(calculateNextRepCount(0, 'correct')).toBe(1);
      expect(calculateNextRepCount(1, 'correct')).toBe(2);
      expect(calculateNextRepCount(2, 'correct')).toBe(3);
    });

    it('2. Yanlış veya boş cevap verildiğinde rep_count sıfırlanır', () => {
      expect(calculateNextRepCount(3, 'incorrect')).toBe(0);
      expect(calculateNextRepCount(1, 'blank')).toBe(0);
    });
  });

  describe('calculateNextSession', () => {
    it('3. Rep sayısına göre bir sonraki oturum aralığını doğru hesaplar', () => {
      // sessionIntervals = [1, 2, 4, 7, 10]
      expect(calculateNextSession('correct', 0)).toBe(1);
      expect(calculateNextSession('correct', 1)).toBe(2);
      expect(calculateNextSession('correct', 2)).toBe(4);
      expect(calculateNextSession('correct', 3)).toBe(7);
      expect(calculateNextSession('correct', 4)).toBe(10);
      expect(calculateNextSession('correct', 10)).toBe(10);
    });

    it('4. Yanlış veya boş cevap verildiğinde bir sonraki oturum aralığı 1 olur', () => {
      expect(calculateNextSession('incorrect', 0)).toBe(1);
      expect(calculateNextSession('blank', 5)).toBe(1);
    });
  });

  describe('calculateScoreChange', () => {
    it('5. Skor değişim miktarlarını doğru döner', () => {
      expect(calculateScoreChange('correct')).toBe(10);
      expect(calculateScoreChange('incorrect')).toBe(-5);
      expect(calculateScoreChange('blank')).toBe(-2);
    });
  });

  describe('calculateQuizResult', () => {
    it('6. SRS ve Skor sonuçlarını birleştirerek SubmissionResult döner', () => {
      const result = calculateQuizResult({ rep_count: 1 }, 'correct', 50, 10);

      expect(result).toEqual({
        isCorrect: true,
        scoreDelta: 10,
        newMastery: 66, // repCountToMasteryScore(2)
        newStatus: 'reviewing',
        nextReviewSession: 14, // 10 + gap(4) for newRepCount 2
        newRepCount: 2,
      });
    });

    it('7. Rep count 3 veya fazlası ise mastered olur', () => {
      const result = calculateQuizResult({ rep_count: 2 }, 'correct', 70, 10);
      expect(result.newStatus).toBe('mastered');
      expect(result.newRepCount).toBe(3);
    });

    it('8. Status null ise rep_count 0 kabul edilerek sonuç üretilir', () => {
      const result = calculateQuizResult(null, 'correct', 0, 1);
      expect(result.newRepCount).toBe(1);
      expect(result.newStatus).toBe('reviewing');
      expect(result.newMastery).toBe(33); // repCountToMasteryScore(1)
    });
  });

  describe('calculateAggregateMastery', () => {
    it('9. Yeni bir soru eklendiğinde toplam soru sayısını ve mastery skorunu doğru hesaplar', () => {
      const result = calculateAggregateMastery({
        currentMastery: 0,
        totalQuestionsSeen: 0,
        oldRepCount: -1,
        newRepCount: 1,
      });

      expect(result).toEqual({
        newMastery: 33,
        newTotalSeen: 1,
      });
    });

    it('10. Mevcut bir sorunun tekrarı yapıldığında mastery skorunu günceller', () => {
      // 3 soru var, toplam mastery 50 (toplam puan 150)
      // Bir soru rep_count 1 -> 2 (33 -> 66)
      const result = calculateAggregateMastery({
        currentMastery: 50,
        totalQuestionsSeen: 3,
        oldRepCount: 1,
        newRepCount: 2,
      });

      // 150 - 33 + 66 = 183
      // 183 / 3 = 61
      expect(result.newMastery).toBe(61);
      expect(result.newTotalSeen).toBe(3);
    });
  });
});
