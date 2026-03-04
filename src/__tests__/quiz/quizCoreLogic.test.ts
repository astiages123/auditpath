import { describe, expect, it } from 'vitest';
import {
  calculateMasteryScore,
  calculateTestResults,
} from '@/features/quiz/logic/quizCoreLogic';

describe('quizCoreLogic - calculateMasteryScore', () => {
  it('sıfır toplam soruda 0 döner', () => {
    expect(calculateMasteryScore(0, 0)).toBe(0);
  });

  it('doğru oranı yüzde olarak döner', () => {
    expect(calculateMasteryScore(7, 10)).toBe(70);
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
