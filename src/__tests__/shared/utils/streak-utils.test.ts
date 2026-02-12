import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateStreak,
  calculateStreakMilestones,
} from '@/shared/lib/core/utils/streak-utils';

describe('streak-utils', () => {
  describe('calculateStreak', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate consecutive days correctly', () => {
      // Set "Today" to 2026-02-11 (Wednesday) 10:00 AM
      const date = new Date(2026, 1, 11, 10, 0, 0);
      vi.setSystemTime(date);

      const activeDays = new Set(['2026-02-11', '2026-02-10', '2026-02-09']);
      expect(calculateStreak(activeDays, '2026-02-09')).toBe(3);
    });

    it('should allow weekend gaps', () => {
      // Set "Today" to 2026-02-09 (Monday) 10:00 AM
      const monday = new Date(2026, 1, 9, 10, 0, 0);
      vi.setSystemTime(monday);

      // Saturday (07) and Sunday (08) are gaps. Friday (06) was active.
      const activeDays = new Set(['2026-02-09', '2026-02-06']);
      expect(calculateStreak(activeDays, '2026-02-06')).toBe(2);
    });

    it('should break streak on weekday gap', () => {
      // Set "Today" to 2026-02-11 (Wednesday)
      vi.setSystemTime(new Date(2026, 1, 11, 10, 0, 0));

      // Tuesday (10) is a gap.
      const activeDays = new Set(['2026-02-11', '2026-02-09']);
      expect(calculateStreak(activeDays, '2026-02-09')).toBe(1);
    });

    it('should count streak if active yesterday but not yet today', () => {
      // Set "Today" to 2026-02-11 (Wednesday)
      vi.setSystemTime(new Date(2026, 1, 11, 10, 0, 0));

      // Active yesterday (10) but not today (11)
      const activeDays = new Set(['2026-02-10', '2026-02-09']);
      expect(calculateStreak(activeDays, '2026-02-09')).toBe(2);
    });
  });

  describe('calculateStreakMilestones', () => {
    it('should calculate max streak with weekend allowance', () => {
      // 2026-02-06 (Fri), 2026-02-09 (Mon)
      const activeDays = ['2026-02-06', '2026-02-09'];
      const milestones = calculateStreakMilestones(activeDays);
      expect(milestones.maxStreak).toBe(2);
    });

    it('should identify first 7-day streak date', () => {
      const activeDays = [
        '2026-02-01',
        '2026-02-02',
        '2026-02-03',
        '2026-02-04',
        '2026-02-05',
        '2026-02-06',
        '2026-02-07',
      ];
      const milestones = calculateStreakMilestones(activeDays);
      expect(milestones.maxStreak).toBe(7);
      expect(milestones.first7StreakDate).toBe('2026-02-07');
    });

    it('should return 0 for empty array', () => {
      expect(calculateStreakMilestones([])).toEqual({
        maxStreak: 0,
        first7StreakDate: null,
      });
    });
  });
});
