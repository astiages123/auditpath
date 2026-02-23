import { describe, expect, it } from 'vitest';
import {
  calculateFocusPower,
  calculateFocusScore,
  calculateLearningFlow,
} from '@/features/efficiency/logic/metricsCalc';

describe('metricsCalc - calculateFocusPower', () => {
  it('ceza eşiği testi: 1 saniyelik duraklama 60 saniye olarak değerlendirilmelidir', () => {
    // Formül: (Work / max(60, Interruption)) * 20
    // Work: 600s (10 dk), Interruption: 1s
    // Beklenen: (600 / 60) * 20 = 200
    const score = calculateFocusPower(600, 1, 0);
    expect(score).toBe(200);
  });

  it('uzun duraklamalarda ceza tam uygulanmalıdır', () => {
    // Work: 600s, Interruption: 120s
    // Beklenen: (600 / 120) * 20 = 100
    const score = calculateFocusPower(600, 60, 60);
    expect(score).toBe(100);
  });

  it('sıfır çalışma süresinde 0 dönmelidir (graceful degradation)', () => {
    expect(calculateFocusPower(0, 10, 10)).toBe(0);
  });
});

describe('metricsCalc - calculateLearningFlow', () => {
  it('sıfır çalışma süresinde 0 dönmelidir', () => {
    expect(calculateLearningFlow(0, 10)).toBe(0);
  });

  it('normal değerlerde doğru oran dönmelidir', () => {
    expect(calculateLearningFlow(100, 20)).toBe(0.2);
  });
});

describe('metricsCalc - calculateFocusScore', () => {
  it('toplam süre sıfır ise 0 dönmelidir', () => {
    expect(
      calculateFocusScore({ totalWork: 0, totalBreak: 0, totalPause: 0 })
    ).toBe(0);
  });

  it('normal değerlerde yüzde dönmelidir', () => {
    // Work: 80, Break: 20 -> %80
    expect(
      calculateFocusScore({
        totalWork: 80,
        totalBreak: 20,
        totalPause: 0,
      })
    ).toBe(80);
  });
});
