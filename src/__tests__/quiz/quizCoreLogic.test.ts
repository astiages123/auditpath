import { describe, expect, it } from 'vitest';
import {
  calculateMastery,
  calculateTestResults,
} from '@/features/quiz/logic/quizCoreLogic';

describe('quizCoreLogic - calculateMastery', () => {
  it('sıfır toplam soruda 0 döner', () => {
    expect(
      calculateMastery(
        { correct: 0, incorrect: 0, blank: 0, totalTimeMs: 0 },
        0
      )
    ).toBe(0);
  });

  it('doğru oranı yüzde olarak döner', () => {
    expect(
      calculateMastery(
        { correct: 7, incorrect: 3, blank: 0, totalTimeMs: 0 },
        10
      )
    ).toBe(70);
  });
});

describe('quizCoreLogic - calculateTestResults', () => {
  it('temel hesaplama testi', () => {
    const result = calculateTestResults(8, 2, 0, 60000);
    expect(result.percentage).toBe(80);
    expect(result.pendingReview).toBe(2);
  });

  it('boş sonuç testi', () => {
    const result = calculateTestResults(0, 0, 0, 0);
    expect(result.percentage).toBe(0);
    expect(result.masteryScore).toBe(0);
  });
});
