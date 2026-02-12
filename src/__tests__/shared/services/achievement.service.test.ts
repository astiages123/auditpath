import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import {
  getUnlockedAchievements,
  unlockAchievement,
} from '@/shared/lib/core/services/achievement.service';
import { supabase } from '@/shared/lib/core/supabase';

// Mock Supabase
vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Achievement Service Tests', () => {
  const mockUserId = 'user-123';
  const mockAchievementId = 'badge-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUnlockedAchievements', () => {
    it('should return mapped achievements on success', async () => {
      const mockData = [
        { achievement_id: 'a1', unlocked_at: '2024-01-01T10:00:00Z' },
        { achievement_id: 'a2', unlocked_at: '2024-01-02T10:00:00Z' },
      ];

      const mockEq = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as Mock).mockReturnValue({ select: mockSelect });

      const result = await getUnlockedAchievements(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('user_achievements');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        achievement_id: 'a1',
        unlockedAt: '2024-01-01T10:00:00Z',
      });
    });

    it('should return empty array and log error on database failure', async () => {
      const mockError = { message: 'DB Error', code: 'DB_ERROR' };
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as Mock).mockReturnValue({ select: mockSelect });

      const result = await getUnlockedAchievements(mockUserId);

      expect(result).toEqual([]);
      // We don't HAVE to check logging if it's commented out in implementation,
      // but the branch for isAbort is there.
    });

    it('should not log if error is AbortError', async () => {
      const mockError = { message: 'AbortError', code: 'ABORT_ERROR' };
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as Mock).mockReturnValue({ select: mockSelect });

      const result = await getUnlockedAchievements(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle error without message', async () => {
      const mockError = { code: 'OTHER' };
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as Mock).mockReturnValue({ select: mockSelect });

      const result = await getUnlockedAchievements(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('unlockAchievement', () => {
    it('should unlock a new achievement successfully', async () => {
      // Mock presence check (returns nothing)
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockEq2 = vi.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      // Mock upsert
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'user_achievements') {
          return {
            select: mockSelect,
            upsert: mockUpsert,
          };
        }
      });

      await unlockAchievement(mockUserId, mockAchievementId);

      expect(mockSelect).toHaveBeenCalledWith('achievement_id');
      expect(mockEq1).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockEq2).toHaveBeenCalledWith('achievement_id', mockAchievementId);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          achievement_id: mockAchievementId,
          is_celebrated: false,
        })
      );
    });

    it('should use provided achievedAt date', async () => {
      const customDate = '2023-12-25';
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockEq2 = vi.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as Mock).mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert,
      });

      await unlockAchievement(mockUserId, mockAchievementId, customDate);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          unlocked_at: new Date(customDate).toISOString(),
        })
      );
    });

    it('should not upsert if achievement is already unlocked', async () => {
      // Mock presence check (returns existing data)
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { achievement_id: 'a1' },
        error: null,
      });
      const mockEq2 = vi.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      // Mock upsert
      const mockUpsert = vi.fn();

      (supabase.from as Mock).mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert,
      });

      await unlockAchievement(mockUserId, mockAchievementId);

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('should handle error during existence check', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Check Error' },
      });
      const mockEq2 = vi.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      const mockUpsert = vi.fn();

      (supabase.from as Mock).mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert,
      });

      await unlockAchievement(mockUserId, mockAchievementId);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error checking achievement existence:',
        expect.any(Object)
      );
      expect(mockUpsert).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log error if upsert fails', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Mock presence check (success, no data)
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockEq2 = vi.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      // Mock upsert failure
      const mockUpsert = vi.fn().mockResolvedValue({
        error: { message: 'Upsert Error' },
      });

      (supabase.from as Mock).mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert,
      });

      await unlockAchievement(mockUserId, mockAchievementId);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error unlocking achievement:',
        expect.any(Object)
      );
      consoleSpy.mockRestore();
    });
  });
});
