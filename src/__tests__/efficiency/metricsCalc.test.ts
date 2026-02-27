import { describe, expect, it } from 'vitest';
import {
  calculateFocusPower,
  calculateFocusScore,
} from '@/features/efficiency/logic/metricsCalc';

describe('metricsCalc - calculateFocusPower', () => {
  it('workSeconds 0 veya negatifse sonucun 0 döndüğünü kanıtlar', () => {
    expect(calculateFocusPower(0, 10, 10)).toBe(0);
    expect(calculateFocusPower(-50, 10, 10)).toBe(0);
  });

  it("Kesinti süresi çok az olsa bile (örneğin 1 saniye), Math.max(60, totalInterruptionSeconds) kuralı gereği paydanın 60'a yuvarlandığını kanıtlar", () => {
    // Formül: (Work / max(60, Interruption)) * 20
    // Work: 120s, Interruption: 1s
    // Payda max(60, 1) = 60 olur
    // Beklenen: (120 / 60) * 20 = 40
    const score = calculateFocusPower(120, 1, 0);
    expect(score).toBe(40);
  });

  it('uzun duraklamalarda ceza tam uygulanmalıdır', () => {
    // Work: 600s, Interruption: 120s (60 break + 60 pause)
    // Beklenen: (600 / 120) * 20 = 100
    const score = calculateFocusPower(600, 60, 60);
    expect(score).toBe(100);
  });
});

describe('metricsCalc - calculateFocusScore', () => {
  it('totalDuration 0 olduğunda crash etmeden 0 döndürdüğünü kanıtlar', () => {
    expect(
      calculateFocusScore({ totalWork: 0, totalBreak: 0, totalPause: 0 })
    ).toBe(0);
  });

  it("sonucun her zaman 100'ü aşmasını engellediğini kanıtlar (clamping to max 100)", () => {
    // totalWork: 120, totalBreak: -20
    // totalDuration = 100
    // Hesap: (120 / 100) * 100 = 120 -> Math.min(100, 120) kuralıyla 100'e yuvarlanmalı
    expect(
      calculateFocusScore({
        totalWork: 120,
        totalBreak: -20,
        totalPause: 0,
      })
    ).toBe(100);
  });

  it('sonucun negatif olmasını engellediğini kanıtlar (clamping to min 0)', () => {
    // totalWork: -10, totalBreak: 110
    // totalDuration = 100
    // Hesap: (-10 / 100) * 100 = -10 -> Math.max(0, -10) kuralıyla 0'a yuvarlanmalı
    expect(
      calculateFocusScore({
        totalWork: -10,
        totalBreak: 110,
        totalPause: 0,
      })
    ).toBe(0);
  });

  it('normal değerlerde doğru yüzde oranını dönmelidir', () => {
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
