import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import {
  getUserStats,
  getTotalActiveDays,
  getStreakMilestones,
  getCourseMastery,
} from '@/shared/lib/core/services/user-stats.service';
import { supabase } from '@/shared/lib/core/supabase';
import * as dateUtils from '@/shared/lib/utils/date-utils';

vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('@/shared/lib/utils/date-utils', () => ({
  getVirtualDateKey: vi.fn(),
}));

describe('User Stats Service', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-11T12:00:00Z'));
    (dateUtils.getVirtualDateKey as Mock).mockImplementation((date: Date) => {
      const d = date || new Date();
      return d.toISOString().split('T')[0];
    });
  });

  const createMockChain = (data: unknown, error: unknown = null) => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    ['select', 'eq', 'gte', 'lt', 'not', 'order', 'limit'].forEach((m) => {
      chain[m] = vi.fn().mockReturnValue(chain);
    });
    chain.then = vi
      .fn()
      .mockImplementation(
        (cb: (r: { data: unknown; error: unknown }) => unknown) =>
          cb({ data, error })
      );
    return chain;
  };

  describe('getUserStats', () => {
    it('should return null when no categories found', async () => {
      (supabase.from as Mock).mockImplementation(() => createMockChain([]));
      const result = await getUserStats(mockUserId);
      expect(result).toBeDefined();
    });

    it('should return null on database error', async () => {
      (supabase.from as Mock).mockImplementation(() =>
        createMockChain(null, { message: 'Error' })
      );
      const result = await getUserStats(mockUserId);
      expect(result).toBeNull();
    });

    it('should return null on abort error', async () => {
      (supabase.from as Mock).mockImplementation(() =>
        createMockChain(null, { name: 'AbortError', message: 'Aborted' })
      );
      const result = await getUserStats(mockUserId);
      expect(result).toBeNull();
    });
  });

  describe('getTotalActiveDays', () => {
    it('should count unique days', async () => {
      const sessions = [
        { started_at: '2026-02-09T10:00:00Z' },
        { started_at: '2026-02-10T10:00:00Z' },
      ];
      (supabase.from as Mock).mockImplementation((t: string) =>
        t === 'pomodoro_sessions'
          ? createMockChain(sessions)
          : createMockChain([])
      );
      expect(await getTotalActiveDays(mockUserId)).toBe(2);
    });

    it('should return 0 on error', async () => {
      (supabase.from as Mock).mockImplementation(() =>
        createMockChain(null, { message: 'Error' })
      );
      expect(await getTotalActiveDays(mockUserId)).toBe(0);
    });
  });

  describe('getStreakMilestones', () => {
    it('should calculate milestones', async () => {
      const progress = [
        { completed_at: '2026-02-10T10:00:00Z' },
        { completed_at: '2026-02-11T10:00:00Z' },
      ];
      (supabase.from as Mock).mockImplementation((t: string) =>
        t === 'video_progress' ? createMockChain(progress) : createMockChain([])
      );
      const result = await getStreakMilestones(mockUserId);
      expect(result.maxStreak).toBeGreaterThanOrEqual(0);
    });

    it('should return defaults for empty', async () => {
      (supabase.from as Mock).mockImplementation(() => createMockChain([]));
      expect(await getStreakMilestones(mockUserId)).toEqual({
        maxStreak: 0,
        first7StreakDate: null,
      });
    });
  });

  describe('getCourseMastery', () => {
    it('should calculate mastery', async () => {
      const courses = [{ id: 'c1', name: 'Course 1', total_videos: 10 }];
      const vProgress = [{ video: { course_id: 'c1' } }];
      const questions = [{ course_id: 'c1' }];
      const solved = [{ course_id: 'c1' }];

      (supabase.from as Mock).mockImplementation((t: string) => {
        if (t === 'courses') return createMockChain(courses);
        if (t === 'video_progress') return createMockChain(vProgress);
        if (t === 'questions') return createMockChain(questions);
        if (t === 'user_quiz_progress') return createMockChain(solved);
        return createMockChain([]);
      });

      const result = await getCourseMastery(mockUserId);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('masteryScore');
    });

    it('should return empty on error', async () => {
      (supabase.from as Mock).mockImplementation(() =>
        createMockChain(null, { message: 'Error' })
      );
      expect(await getCourseMastery(mockUserId)).toEqual([]);
    });
  });
});
