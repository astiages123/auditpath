import { describe, it, expect } from 'vitest';
import {
  calculateScoreChange,
  calculateTMax,
  calculateMastery,
  calculateTestResults,
} from '@/features/quiz/logic/quizCoreLogic';

describe('quizCoreLogic - calculateScoreChange', () => {
  it('isRepeated=true ve incorrect ise -10 puan', () => {
    const result = calculateScoreChange('incorrect', 50, true);
    expect(result.delta).toBe(-10);
    expect(result.newScore).toBe(40);
  });

  it('isRepeated=false ve incorrect ise -5 puan', () => {
    const result = calculateScoreChange('incorrect', 50, false);
    expect(result.delta).toBe(-5);
    expect(result.newScore).toBe(45);
  });

  it('isRepeated=false ve blank ise -2 puan', () => {
    const result = calculateScoreChange('blank', 50, false);
    expect(result.delta).toBe(-2);
    expect(result.newScore).toBe(48);
  });

  it('doğru cevap ise +10 puan', () => {
    const result = calculateScoreChange('correct', 50, false);
    expect(result.delta).toBe(10);
    expect(result.newScore).toBe(60);
  });

  it('doğru cevap isRepeated=true olsa bile +10 puan', () => {
    const result = calculateScoreChange('correct', 50, true);
    expect(result.delta).toBe(10);
    expect(result.newScore).toBe(60);
  });

  it('puan 0ın altına düşmez', () => {
    const result = calculateScoreChange('incorrect', 3, true);
    expect(result.newScore).toBe(0);
  });

  it('puan 100ü geçmez', () => {
    const result = calculateScoreChange('correct', 95, false);
    expect(result.newScore).toBe(100);
  });
});

describe('quizCoreLogic - calculateTMax', () => {
  it('sıfır içerik için bufferSeconds dahil minimum süre döner', () => {
    const result = calculateTMax(0, 0, 'knowledge', 10);
    expect(result).toBeGreaterThan(10000);
  });

  it('çok kısa içerik için bile buffer sayesinde makul süre döner', () => {
    const result = calculateTMax(100, 1, 'knowledge', 10);
    expect(result).toBeGreaterThan(10000);
  });

  it('karmaşık içerik için daha uzun süre döner', () => {
    const short = calculateTMax(100, 1, 'knowledge', 10);
    const long = calculateTMax(10000, 10, 'analysis', 10);
    expect(long).toBeGreaterThan(short);
  });

  it('farklı bloom seviyeleri için farklı süreler döner', () => {
    const knowledge = calculateTMax(1000, 5, 'knowledge', 10);
    const application = calculateTMax(1000, 5, 'application', 10);
    const analysis = calculateTMax(1000, 5, 'analysis', 10);
    expect(application).toBeGreaterThan(knowledge);
    expect(analysis).toBeGreaterThan(application);
  });
});

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
