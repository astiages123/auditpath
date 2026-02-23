import { describe, expect, it } from 'vitest';
import {
  calculateMastery,
  calculateScoreChange,
  calculateTestResults,
  calculateTMax,
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
    const result = calculateTMax({
      charCount: 0,
      conceptCount: 0,
      bloomLevel: 'knowledge',
      bufferSeconds: 10,
    });
    expect(result).toBeGreaterThan(10000);
  });

  it('çok kısa içerik için bile buffer sayesinde makul süre döner', () => {
    const result = calculateTMax({
      charCount: 100,
      conceptCount: 1,
      bloomLevel: 'knowledge',
      bufferSeconds: 10,
    });
    expect(result).toBeGreaterThan(10000);
  });

  it('karmaşık içerik için daha uzun süre döner', () => {
    const short = calculateTMax({
      charCount: 100,
      conceptCount: 1,
      bloomLevel: 'knowledge',
      bufferSeconds: 10,
    });
    const long = calculateTMax({
      charCount: 10000,
      conceptCount: 10,
      bloomLevel: 'analysis',
      bufferSeconds: 10,
    });
    expect(long).toBeGreaterThan(short);
  });

  it('farklı bloom seviyeleri için farklı süreler döner', () => {
    const knowledge = calculateTMax({
      charCount: 1000,
      conceptCount: 5,
      bloomLevel: 'knowledge',
      bufferSeconds: 10,
    });
    const application = calculateTMax({
      charCount: 1000,
      conceptCount: 5,
      bloomLevel: 'application',
      bufferSeconds: 10,
    });
    const analysis = calculateTMax({
      charCount: 1000,
      conceptCount: 5,
      bloomLevel: 'analysis',
      bufferSeconds: 10,
    });
    expect(application).toBeGreaterThan(knowledge);
    expect(analysis).toBeGreaterThan(application);
  });

  it('10 karakterlik metin ile 5000 karakterlik metin süre farkı (isFast eşiği)', () => {
    const short = calculateTMax({
      charCount: 10,
      conceptCount: 1,
      bloomLevel: 'knowledge',
      bufferSeconds: 10,
    }); // Çok kısa
    const long = calculateTMax({
      charCount: 5000,
      conceptCount: 1,
      bloomLevel: 'knowledge',
      bufferSeconds: 10,
    }); // Çok uzun
    // 10 karakter için okuma süresi çok az olmalı, 5000 karakter için ciddi bir süre eklenmeli
    expect(long).toBeGreaterThan(short + 30000); // En az 30 saniye fark bekliyoruz
  });

  it('Bloom seviyesi çarpanlarının uç durumlardaki etkisi', () => {
    const conceptCount = 10;
    const knowledge = calculateTMax({
      charCount: 5000,
      conceptCount,
      bloomLevel: 'knowledge',
      bufferSeconds: 0,
    });
    const analysis = calculateTMax({
      charCount: 5000,
      conceptCount,
      bloomLevel: 'analysis',
      bufferSeconds: 0,
    });

    // Knowledge: (Reading + (15 + 10*2)*1.0) * 1000
    // Analysis: (Reading + (15 + 10*2)*1.5) * 1000
    // Fark: (35 * 0.5) * 1000 = 17500 ms olmalı
    expect(analysis - knowledge).toBe(17500);
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
