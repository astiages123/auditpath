import { describe, expect, it } from 'vitest';
import {
  calculateEfficiencyScore,
  calculateGoalProgress,
  calculateLearningFlow,
  formatEfficiencyTime,
  generateDateRange,
} from '@/features/efficiency/logic/efficiencyHelpers';
import { EFFICIENCY_THRESHOLDS } from '@/features/efficiency/utils/constants';

// ============================================================
// calculateEfficiencyScore
// ============================================================
describe('calculateEfficiencyScore', () => {
  it('sıfır çalışma süresinde 0 dönmeli (sıfır bölme koruması)', () => {
    expect(calculateEfficiencyScore(60, 0)).toBe(0);
  });

  it('negatif çalışma süresinde 0 dönmeli', () => {
    expect(calculateEfficiencyScore(60, -10)).toBe(0);
  });

  it('sıfır video, pozitif çalışma → 0.00 dönmeli', () => {
    expect(calculateEfficiencyScore(0, 100)).toBe(0);
  });

  it('eşit video ve çalışma → 1.00 dönmeli', () => {
    expect(calculateEfficiencyScore(100, 100)).toBe(1.0);
  });

  it('2 ondalık hassasiyetle yuvarlama yapmalı', () => {
    // 1/3 = 0.3333... → 0.33
    expect(calculateEfficiencyScore(1, 3)).toBe(0.33);
  });

  it('normal değerlerde doğru oran hesaplamalı', () => {
    expect(calculateEfficiencyScore(80, 100)).toBe(0.8);
  });
});

// ============================================================
// calculateLearningFlow (efficiencyHelpers versiyonu)
// - Hem skor hem state dönmeli
// ============================================================
describe('calculateLearningFlow (efficiencyHelpers)', () => {
  it('sıfır pomodoro süresinde {score: 0, state: "stuck"} dönmeli', () => {
    const result = calculateLearningFlow({
      totalVideoTime: 30,
      totalPomodoroTime: 0,
    });
    expect(result.score).toBe(0);
    expect(result.state).toBe('stuck');
  });

  // State sınır testleri - EFFICIENCY_THRESHOLDS ile tutarlılık kontrolü
  it(`score < ${EFFICIENCY_THRESHOLDS.STUCK} ise "stuck" state dönmeli`, () => {
    const result = calculateLearningFlow({
      totalVideoTime: 5,
      totalPomodoroTime: 100,
    });
    // 5/100 = 0.05 < 0.3 (STUCK)
    expect(result.state).toBe('stuck');
  });

  it(`${EFFICIENCY_THRESHOLDS.STUCK} <= score < ${EFFICIENCY_THRESHOLDS.DEEP} ise "deep" state dönmeli`, () => {
    // score = 0.5 → deep (0.3 <= 0.5 < 0.7)
    const result = calculateLearningFlow({
      totalVideoTime: 50,
      totalPomodoroTime: 100,
    });
    expect(result.state).toBe('deep');
  });

  it(`${EFFICIENCY_THRESHOLDS.DEEP} <= score <= ${EFFICIENCY_THRESHOLDS.OPTIMAL_MAX} ise "optimal" state dönmeli`, () => {
    // score = 1.0 → optimal (0.7 <= 1.0 <= 1.3)
    const result = calculateLearningFlow({
      totalVideoTime: 100,
      totalPomodoroTime: 100,
    });
    expect(result.state).toBe('optimal');
    expect(result.score).toBe(1.0);
  });

  it(`score tam ${EFFICIENCY_THRESHOLDS.OPTIMAL_MAX} ise "optimal" kalmalı (üst sınır dahil)`, () => {
    // score = 1.3 → optimal (OPTIMAL_MAX dahil)
    const result = calculateLearningFlow({
      totalVideoTime: 130,
      totalPomodoroTime: 100,
    });
    expect(result.state).toBe('optimal');
  });

  it(`${EFFICIENCY_THRESHOLDS.OPTIMAL_MAX} < score <= ${EFFICIENCY_THRESHOLDS.SPEED} ise "speed" dönmeli`, () => {
    // score = 1.5 → speed (1.3 < 1.5 <= 1.7)
    const result = calculateLearningFlow({
      totalVideoTime: 150,
      totalPomodoroTime: 100,
    });
    expect(result.state).toBe('speed');
  });

  it(`score > ${EFFICIENCY_THRESHOLDS.SPEED} ise "shallow" dönmeli`, () => {
    // score = 2.0 → shallow
    const result = calculateLearningFlow({
      totalVideoTime: 200,
      totalPomodoroTime: 100,
    });
    expect(result.state).toBe('shallow');
  });

  it('dönen score, calculateEfficiencyScore ile tutarlı olmalı', () => {
    const result = calculateLearningFlow({
      totalVideoTime: 80,
      totalPomodoroTime: 100,
    });
    // 80/100 = 0.80
    expect(result.score).toBe(0.8);
  });
});

// ============================================================
// calculateGoalProgress
// ============================================================
describe('calculateGoalProgress', () => {
  it('sıfır hedefte 0 dönmeli (sıfır bölme koruması)', () => {
    expect(calculateGoalProgress(100, 0)).toBe(0);
  });

  it('negatif hedefte 0 dönmeli', () => {
    expect(calculateGoalProgress(100, -50)).toBe(0);
  });

  it('normal değerde doğru yüzde hesaplamalı', () => {
    expect(calculateGoalProgress(100, 200)).toBe(50);
  });

  it('hedefin üzerinde bile maksimum 100 dönmeli', () => {
    expect(calculateGoalProgress(300, 200)).toBe(100);
  });

  it('tam hedefte %100 dönmeli', () => {
    expect(calculateGoalProgress(200, 200)).toBe(100);
  });

  it('sıfır çalışmada %0 dönmeli', () => {
    expect(calculateGoalProgress(0, 200)).toBe(0);
  });

  it('yuvarlama doğru yapılmalı', () => {
    // 1/3 * 100 = 33.33... → 33
    expect(calculateGoalProgress(1, 3)).toBe(33);
  });
});

// ============================================================
// formatEfficiencyTime
// ============================================================
describe('formatEfficiencyTime', () => {
  it('60 dakikayı "1sa 0dk" olarak formatlamalı', () => {
    expect(formatEfficiencyTime(60)).toBe('1sa 0dk');
  });

  it('75 dakikayı "1sa 15dk" olarak formatlamalı', () => {
    expect(formatEfficiencyTime(75)).toBe('1sa 15dk');
  });

  it('0 dakikayı "0sa 0dk" olarak formatlamalı', () => {
    expect(formatEfficiencyTime(0)).toBe('0sa 0dk');
  });

  it('45 dakikayı "0sa 45dk" olarak formatlamalı', () => {
    expect(formatEfficiencyTime(45)).toBe('0sa 45dk');
  });

  it('200 dakikayı "3sa 20dk" olarak formatlamalı', () => {
    expect(formatEfficiencyTime(200)).toBe('3sa 20dk');
  });
});

// ============================================================
// generateDateRange
// ============================================================
describe('generateDateRange', () => {
  it('doğru sayıda tarih üretmeli', () => {
    const dates = generateDateRange(7);
    expect(dates).toHaveLength(7);
  });

  it('YYYY-MM-DD formatında tarihler üretmeli', () => {
    const dates = generateDateRange(1);
    expect(dates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('0 gün için boş dizi dönmeli', () => {
    expect(generateDateRange(0)).toHaveLength(0);
  });

  it('tüm tarihler benzersiz olmalı', () => {
    const dates = generateDateRange(30);
    const unique = new Set(dates);
    expect(unique.size).toBe(30);
  });
});
