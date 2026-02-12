import { describe, expect, it } from 'vitest';
import {
  calculateFocusPower,
  calculateFocusScore,
  calculateLearningFlow,
  calculatePauseCount,
  calculateSessionTotals,
  getCycleCount,
} from '@/shared/lib/core/utils/efficiency-math';

describe('efficiency-math', () => {
  describe('calculateSessionTotals', () => {
    it('should return zeros for empty timeline', () => {
      expect(calculateSessionTotals([])).toEqual({
        totalWork: 0,
        totalBreak: 0,
        totalPause: 0,
      });
    });

    it('should calculate simple work and break', () => {
      const now = 10000;
      const timeline = [
        { type: 'work', start: 0, end: 5000 },
        { type: 'break', start: 5000, end: 8000 },
      ];
      // 5s work, 3s break
      expect(calculateSessionTotals(timeline, now)).toEqual({
        totalWork: 5,
        totalBreak: 3,
        totalPause: 0,
      });
    });

    it('should handle ongoing event using now', () => {
      const now = 10000;
      const timeline = [
        { type: 'work', start: 0, end: 5000 },
        { type: 'work', start: 5000 }, // ongoing
      ];
      // 10s total work
      expect(calculateSessionTotals(timeline, now)).toEqual({
        totalWork: 10,
        totalBreak: 0,
        totalPause: 0,
      });
    });

    it('should prevent double counting on overlaps', () => {
      const now = 10000;
      const timeline = [
        { type: 'work', start: 0, end: 7000 },
        { type: 'break', start: 5000, end: 8000 }, // Overlaps with work from 5000-7000
      ];
      // Work: 0 to 5000 (5s), Break: 5000 to 8000 (3s)
      expect(calculateSessionTotals(timeline, now)).toEqual({
        totalWork: 5,
        totalBreak: 3,
        totalPause: 0,
      });
    });

    it('should handle turkish labels for event types', () => {
      const now = 5000;
      const timeline = [
        { type: 'çalışma', start: 0, end: 1000 }, // work
        { type: 'mola', start: 1000, end: 2000 }, // break
        { type: 'duraklatma', start: 2000, end: 3000 }, // pause
      ];
      expect(calculateSessionTotals(timeline, now)).toEqual({
        totalWork: 1,
        totalBreak: 1,
        totalPause: 1,
      });
    });
  });

  describe('calculatePauseCount', () => {
    it('should return 0 for empty or invalid timeline', () => {
      expect(calculatePauseCount([])).toBe(0);
      expect(calculatePauseCount(null)).toBe(0);
    });

    it('should count various pause labels', () => {
      const timeline = [
        { type: 'work' },
        { type: 'pause' },
        { type: 'duraklatma' },
        { type: 'duraklama' },
        { type: 'mola' },
      ];
      expect(calculatePauseCount(timeline)).toBe(3);
    });
  });

  describe('calculateLearningFlow', () => {
    it('should return 0 if workMinutes is 0', () => {
      expect(calculateLearningFlow(0, 10)).toBe(0);
    });

    it('should calculate ratio correctly', () => {
      expect(calculateLearningFlow(100, 50)).toBe(0.5);
      expect(calculateLearningFlow(100, 75.5)).toBe(0.76);
    });
  });

  describe('calculateFocusPower', () => {
    it('should return 0 if workSeconds is 0', () => {
      expect(calculateFocusPower(0, 10, 10)).toBe(0);
    });

    it('should use minimum of 60 seconds for interruptions', () => {
      // (120 / max(60, 0)) * 20 = (120 / 60) * 20 = 2 * 20 = 40
      expect(calculateFocusPower(120, 0, 0)).toBe(40);
    });

    it('should calculate score correctly with substantial interruptions', () => {
      // (600 / 300) * 20 = 2 * 20 = 40
      expect(calculateFocusPower(600, 150, 150)).toBe(40);
    });
  });

  describe('calculateFocusScore', () => {
    it('should return 0 if total duration is 0', () => {
      expect(
        calculateFocusScore({
          totalWork: 0,
          totalBreak: 0,
          totalPause: 0,
        })
      ).toBe(0);
    });

    it('should calculate percentage correctly', () => {
      expect(
        calculateFocusScore({
          totalWork: 80,
          totalBreak: 20,
          totalPause: 0,
        })
      ).toBe(80);
      expect(
        calculateFocusScore({
          totalWork: 40,
          totalBreak: 60,
          totalPause: 0,
        })
      ).toBe(40);
    });

    it('should clamp score between 0 and 100', () => {
      // Should not exceed 100 even if math is weird (though here it shouldn't be)
      expect(
        calculateFocusScore({
          totalWork: 100,
          totalBreak: 0,
          totalPause: 0,
        })
      ).toBe(100);
    });
  });

  describe('getCycleCount', () => {
    it('should return 0 for non-array', () => {
      expect(getCycleCount(null)).toBe(0);
    });

    it('should count single work block', () => {
      const timeline = [
        { type: 'work', start: 0 },
        { type: 'work', start: 1000 },
      ];
      expect(getCycleCount(timeline)).toBe(1);
    });

    it('should count multiple work blocks separated by breaks', () => {
      const timeline = [
        { type: 'work', start: 0, end: 1000 },
        { type: 'break', start: 1000, end: 2000 },
        { type: 'work', start: 2000, end: 3000 },
      ];
      expect(getCycleCount(timeline)).toBe(2);
    });

    it('should not increment count on pause', () => {
      const timeline = [
        { type: 'work', start: 0, end: 1000 },
        { type: 'pause', start: 1000, end: 2000 },
        { type: 'work', start: 2000, end: 3000 },
      ];
      expect(getCycleCount(timeline)).toBe(1);
    });

    it('should handle turkish labels', () => {
      const timeline = [
        { type: 'çalışma', start: 0, end: 1000 },
        { type: 'mola', start: 1000, end: 2000 },
        { type: 'odak', start: 2000, end: 3000 },
      ];
      expect(getCycleCount(timeline)).toBe(2);
    });
  });
});
