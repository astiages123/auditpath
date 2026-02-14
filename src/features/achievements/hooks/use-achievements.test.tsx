import { renderHook, waitFor } from '@testing-library/react';
import { useSyncAchievementsMutation } from './use-achievements';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/core/supabase';
import * as clientDb from '@/shared/lib/core/client-db';
import { ProgressStats } from '@/shared/hooks/use-progress';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { Rank } from '@/shared/types/core';
import { UnlockedAchievement } from '@/shared/types/efficiency';

// Mock dependencies
vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/shared/lib/core/client-db', () => ({
  getTotalActiveDays: vi.fn(),
  getDailyVideoMilestones: vi.fn(),
  getStreakMilestones: vi.fn(),
  getUnlockedAchievements: vi.fn(),
}));

vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Mock coursesData with absolute alias path if possible, or relative
vi.mock('@/features/courses/data/courses.json', () => ({
  default: [
    {
      category: 'HUKUK',
      courses: [{ id: 'course-1', totalVideos: 10 }],
    },
  ],
}));

// Create a wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSyncAchievementsMutation', () => {
  const userId = 'test-user';
  const mockStats: ProgressStats = {
    completedVideos: 10,
    totalVideos: 100,
    completedHours: 5,
    totalHours: 50,
    streak: 5,
    currentRank: {
      id: '2',
      name: 'Yazıcı',
      order: 2,
      minPercentage: 0,
      color: 'blue',
      motto: '...',
      imagePath: '...',
    },
    courseProgress: { 'course-1': 10 },
    categoryProgress: {
      HUKUK: {
        completedVideos: 10,
        totalVideos: 10,
        completedHours: 10,
        totalHours: 10,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('performs upsert when new achievements are earned', async () => {
    // Mock data for calculation
    vi.mocked(clientDb.getTotalActiveDays).mockResolvedValue(5);
    vi.mocked(clientDb.getDailyVideoMilestones).mockResolvedValue({
      maxCount: 2,
      first5Date: null,
      first10Date: null,
    });
    vi.mocked(clientDb.getStreakMilestones).mockResolvedValue({
      maxStreak: 5,
      first7StreakDate: null,
    });
    vi.mocked(clientDb.getUnlockedAchievements).mockResolvedValue([]);

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({
      upsert: upsertMock,
    } as never);

    const { result } = renderHook(() => useSyncAchievementsMutation(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ stats: mockStats, userId });

    // Verify upsert was called
    expect(upsertMock).toHaveBeenCalled();
    const updates = upsertMock.mock.calls[0][0];
    expect(
      updates.some((u: { achievement_id: string }) =>
        u.achievement_id.startsWith('RANK_UP:')
      )
    ).toBe(true);
  });

  it('unlocks course and category completions', async () => {
    vi.mocked(clientDb.getUnlockedAchievements).mockResolvedValue([]);
    vi.mocked(clientDb.getDailyVideoMilestones).mockResolvedValue({
      maxCount: 0,
      first5Date: null,
      first10Date: null,
    });
    vi.mocked(clientDb.getStreakMilestones).mockResolvedValue({
      maxStreak: 0,
      first7StreakDate: null,
    });

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({
      upsert: upsertMock,
    } as never);

    const { result } = renderHook(() => useSyncAchievementsMutation(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ stats: mockStats, userId });

    const updates = upsertMock.mock.calls[0][0];
    expect(
      updates.some(
        (u: { achievement_id: string }) =>
          u.achievement_id === 'COURSE_COMPLETION:course-1'
      )
    ).toBe(true);
    expect(
      updates.some(
        (u: { achievement_id: string }) =>
          u.achievement_id === 'CATEGORY_COMPLETION:HUKUK'
      )
    ).toBe(true);
  });

  it('Incomplete Load Guard: does not revoke when currentRank is missing', async () => {
    const incompleteStats = { ...mockStats, currentRank: null };

    // DB has achievements
    vi.mocked(clientDb.getUnlockedAchievements).mockResolvedValue([
      {
        achievement_id: 'some-id',
        user_id: userId,
        unlockedAt: new Date().toISOString(),
      } as UnlockedAchievement,
    ]);
    vi.mocked(clientDb.getTotalActiveDays).mockResolvedValue(1);
    vi.mocked(clientDb.getDailyVideoMilestones).mockResolvedValue({
      maxCount: 0,
      first5Date: null,
      first10Date: null,
    });
    vi.mocked(clientDb.getStreakMilestones).mockResolvedValue({
      maxStreak: 0,
      first7StreakDate: null,
    });

    const deleteMock = vi.fn().mockReturnThis();
    const fromMock = vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: deleteMock,
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(supabase.from).mockImplementation(fromMock);

    const { result } = renderHook(() => useSyncAchievementsMutation(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      stats: incompleteStats as never,
      userId,
    });

    // Delete should NOT be called because isIncompleteLoad will be true
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('Rank-Up Permanency: does not revoke rank achievements even if not eligible', async () => {
    // DB has a rank achievement
    vi.mocked(clientDb.getUnlockedAchievements).mockResolvedValue([
      {
        achievement_id: 'RANK_UP:3',
        user_id: userId,
        unlockedAt: new Date().toISOString(),
      } as UnlockedAchievement,
    ]);

    // Stats make user eligible only for Rank 1
    const lowStats = {
      ...mockStats,
      currentRank: {
        id: '1',
        order: 1,
        name: 'Sürgün',
        minPercentage: 0,
        color: 'gray',
        motto: '...',
        imagePath: '...',
      } as Rank,
      courseProgress: {},
      categoryProgress: {},
    };

    const deleteInMock = vi.fn().mockResolvedValue({ error: null });
    const deleteEqMock = vi.fn().mockReturnValue({ in: deleteInMock });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });

    vi.mocked(supabase.from).mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: deleteMock,
    } as never);

    const { result } = renderHook(() => useSyncAchievementsMutation(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ stats: lowStats, userId });

    // If it was called, check that RANK_UP:3 is not in the revoke list
    if (vi.mocked(deleteInMock).mock.calls.length > 0) {
      const revokedIds = deleteInMock.mock.calls[0][1];
      expect(revokedIds).not.toContain('RANK_UP:3');
    }
  });

  it('uses specific milestones dates for special achievements', async () => {
    vi.mocked(clientDb.getUnlockedAchievements).mockResolvedValue([]);
    vi.mocked(clientDb.getDailyVideoMilestones).mockResolvedValue({
      maxCount: 10,
      first5Date: '2024-01-01T10:00:00Z',
      first10Date: '2024-01-02T10:00:00Z',
    });
    vi.mocked(clientDb.getStreakMilestones).mockResolvedValue({
      maxStreak: 7,
      first7StreakDate: '2024-01-07T10:00:00Z',
    });

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({
      upsert: upsertMock,
    } as never);

    const { result } = renderHook(() => useSyncAchievementsMutation(), {
      wrapper: createWrapper(),
    });

    // We need to trigger eligible for special-01, special-02, special-03
    // Daily video 10+ and streak 7+
    const specialStats = {
      ...mockStats,
      streak: 7,
      dailyVideosCompleted: 10,
    };

    await result.current.mutateAsync({
      stats: specialStats as never,
      userId,
    });

    const updates = upsertMock.mock.calls[0][0];
    const s01 = updates.find(
      (u: { achievement_id: string }) => u.achievement_id === 'special-01'
    );
    const s02 = updates.find(
      (u: { achievement_id: string }) => u.achievement_id === 'special-02'
    );
    const s03 = updates.find(
      (u: { achievement_id: string }) => u.achievement_id === 'special-03'
    );

    expect(s01?.unlocked_at).toBe('2024-01-01T10:00:00.000Z');
    expect(s02?.unlocked_at).toBe('2024-01-02T10:00:00.000Z');
    expect(s03?.unlocked_at).toBe('2024-01-07T10:00:00.000Z');
  });

  it('revokes achievements that are no longer eligible and not permanent', async () => {
    // DB has an achievement that is NOT permanent and NOT eligible
    vi.mocked(clientDb.getUnlockedAchievements).mockResolvedValue([
      {
        achievement_id: 'temporary-id',
        user_id: userId,
        unlockedAt: new Date().toISOString(),
      } as UnlockedAchievement,
    ]);
    vi.mocked(clientDb.getTotalActiveDays).mockResolvedValue(1);
    vi.mocked(clientDb.getDailyVideoMilestones).mockResolvedValue({
      maxCount: 0,
      first5Date: null,
      first10Date: null,
    });
    vi.mocked(clientDb.getStreakMilestones).mockResolvedValue({
      maxStreak: 0,
      first7StreakDate: null,
    });

    const deleteInMock = vi.fn().mockResolvedValue({ error: null });
    const deleteEqMock = vi.fn().mockReturnValue({ in: deleteInMock });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });

    vi.mocked(supabase.from).mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: deleteMock,
    } as never);

    const { result } = renderHook(() => useSyncAchievementsMutation(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ stats: mockStats, userId });

    expect(deleteMock).toHaveBeenCalled();
    expect(deleteInMock).toHaveBeenCalledWith('achievement_id', [
      'temporary-id',
    ]);
  });

  it('handles mutation errors and logs them', async () => {
    const error = new Error('Upsert failed');
    vi.mocked(supabase.from).mockReturnValue({
      upsert: vi.fn().mockRejectedValue(error),
    } as never);

    const { result } = renderHook(() => useSyncAchievementsMutation(), {
      wrapper: createWrapper(),
    });

    const { logger } = await import('@/shared/lib/core/utils/logger');

    await expect(
      result.current.mutateAsync({ stats: mockStats, userId })
    ).rejects.toThrow();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Achievement Sync Mutation Error:'),
      error
    );
  });

  it('marks achievement as celebrated', async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock1 = vi.fn().mockReturnThis();
    const eqMock2 = vi.fn().mockReturnThis();
    const eqMock3 = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
    } as never);
    updateMock.mockReturnValue({ eq: eqMock1 });
    eqMock1.mockReturnValue({ eq: eqMock2 });
    eqMock2.mockReturnValue({ eq: eqMock3 });

    const { markAsCelebrated } = await import('./use-achievements');
    await markAsCelebrated(userId, 'test-id');

    expect(updateMock).toHaveBeenCalledWith({ is_celebrated: true });
    expect(eqMock1).toHaveBeenCalledWith('user_id', userId);
    expect(eqMock2).toHaveBeenCalledWith('achievement_id', 'test-id');
  });

  it('useUncelebratedQuery returns data from supabase', async () => {
    const selectMock = vi.fn().mockReturnThis();
    const eqMock1 = vi.fn().mockReturnThis();
    const eqMock2 = vi
      .fn()
      .mockResolvedValue({ data: [{ achievement_id: 'a1' }], error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
    } as never);
    selectMock.mockReturnValue({ eq: eqMock1 });
    eqMock1.mockReturnValue({ eq: eqMock2 });

    const { useUncelebratedQuery } = await import('./use-achievements');
    const { result } = renderHook(() => useUncelebratedQuery(userId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ achievement_id: 'a1' }]);
  });
});
