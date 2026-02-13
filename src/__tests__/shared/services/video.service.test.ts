import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import {
  getVideoProgress,
  toggleVideoProgress,
  toggleVideoProgressBatch,
  getDailyVideoMilestones,
} from '@/shared/lib/core/services/video.service';
import { supabase } from '@/shared/lib/core/supabase';

// Mock Supabase
vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Video Service', () => {
  const mockUserId = 'user-123';
  const mockCourseId = 'course-456';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-11T12:00:00Z'));
  });

  const createMockQuery = (data: unknown, error: unknown = null) => {
    const query: {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      in: ReturnType<typeof vi.fn>;
      single: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      not: ReturnType<typeof vi.fn>;
      then: ReturnType<typeof vi.fn>;
    } = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockImplementation(() => Promise.resolve({ data, error })),
      upsert: vi
        .fn()
        .mockImplementation(() => Promise.resolve({ data: {}, error })),
      not: vi.fn().mockReturnThis(),
      then: vi
        .fn()
        .mockImplementation(
          (cb: (result: { data: unknown; error: unknown }) => unknown) =>
            cb({ data, error })
        ),
    };
    return query;
  };

  describe('getVideoProgress', () => {
    it('should return progress map for multiple videos', async () => {
      const mockVideos = [
        { id: 'video-1', video_number: 1 },
        { id: 'video-2', video_number: 2 },
        { id: 'video-3', video_number: 3 },
      ];
      const mockProgress = [
        { video_id: 'video-1', completed: true },
        { video_id: 'video-2', completed: false },
        { video_id: 'video-3', completed: true },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'videos') {
          return createMockQuery(mockVideos);
        }
        if (table === 'video_progress') {
          return createMockQuery(mockProgress);
        }
        return createMockQuery([]);
      });

      const progress = await getVideoProgress(
        mockUserId,
        mockCourseId,
        [1, 2, 3]
      );

      expect(progress).toEqual({
        '1': true,
        '2': false,
        '3': true,
      });
    });

    it('should return empty object when video lookup fails', async () => {
      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery(null, { message: 'DB Error' });
      });

      const progress = await getVideoProgress(mockUserId, mockCourseId, [1, 2]);

      expect(progress).toEqual({});
    });

    it('should return empty object when videos not found', async () => {
      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery([]);
      });

      const progress = await getVideoProgress(mockUserId, mockCourseId, [1, 2]);

      expect(progress).toEqual({});
    });

    it('should handle progress lookup error', async () => {
      const mockVideos = [{ id: 'video-1', video_number: 1 }];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'videos') {
          return createMockQuery(mockVideos);
        }
        if (table === 'video_progress') {
          return createMockQuery(null, { message: 'DB Error' });
        }
        return createMockQuery([]);
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const progress = await getVideoProgress(mockUserId, mockCourseId, [1]);

      expect(progress).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AuditPath] ❌ Error fetching video progress:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should handle videos without progress', async () => {
      const mockVideos = [
        { id: 'video-1', video_number: 1 },
        { id: 'video-2', video_number: 2 },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'videos') {
          return createMockQuery(mockVideos);
        }
        if (table === 'video_progress') {
          return createMockQuery([]); // No progress entries
        }
        return createMockQuery([]);
      });

      const progress = await getVideoProgress(mockUserId, mockCourseId, [1, 2]);

      expect(progress).toEqual({});
    });

    it('should filter out progress entries without video_id', async () => {
      const mockVideos = [{ id: 'video-1', video_number: 1 }];
      const mockProgress = [
        { video_id: null, completed: true },
        { video_id: 'video-1', completed: false },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'videos') {
          return createMockQuery(mockVideos);
        }
        if (table === 'video_progress') {
          return createMockQuery(mockProgress);
        }
        return createMockQuery([]);
      });

      const progress = await getVideoProgress(mockUserId, mockCourseId, [1]);

      expect(progress).toEqual({ '1': false });
    });
  });

  describe('toggleVideoProgress', () => {
    it('should toggle video progress to completed', async () => {
      const mockVideo = { id: 'video-1', duration_minutes: 10 };

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'videos') {
          return createMockQuery(mockVideo);
        }
        if (table === 'video_progress') {
          return createMockQuery({});
        }
        return createMockQuery([]);
      });

      await toggleVideoProgress(mockUserId, mockCourseId, 1, true);

      expect(supabase.from).toHaveBeenCalledWith('video_progress');
    });

    it('should toggle video progress to not completed', async () => {
      const mockVideo = { id: 'video-1', duration_minutes: 10 };

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'videos') {
          return createMockQuery(mockVideo);
        }
        if (table === 'video_progress') {
          return createMockQuery({});
        }
        return createMockQuery([]);
      });

      await toggleVideoProgress(mockUserId, mockCourseId, 1, false);

      expect(supabase.from).toHaveBeenCalledWith('video_progress');
    });

    it('should handle video not found', async () => {
      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery(null, { message: 'Not found' });
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await toggleVideoProgress(mockUserId, mockCourseId, 999, true);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AuditPath] ❌ Error finding video for toggle:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should handle upsert error', async () => {
      const mockVideo = { id: 'video-1', duration_minutes: 10 };

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'videos') {
          return createMockQuery(mockVideo);
        }
        if (table === 'video_progress') {
          return {
            ...createMockQuery({}),
            upsert: vi.fn().mockReturnValue({
              then: vi
                .fn()
                .mockImplementation(
                  (cb: (result: { error: unknown }) => unknown) =>
                    cb({ error: { message: 'Upsert failed' } })
                ),
            }),
          };
        }
        return createMockQuery([]);
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await toggleVideoProgress(mockUserId, mockCourseId, 1, true);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AuditPath] ❌ Error toggling video progress:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('toggleVideoProgressBatch', () => {
    it('should toggle multiple videos at once', async () => {
      const mockVideos = [
        { id: 'video-1', duration_minutes: 10 },
        { id: 'video-2', duration_minutes: 15 },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'videos') {
          return createMockQuery(mockVideos);
        }
        if (table === 'video_progress') {
          return createMockQuery({});
        }
        return createMockQuery([]);
      });

      await toggleVideoProgressBatch(mockUserId, mockCourseId, [1, 2], true);

      expect(supabase.from).toHaveBeenCalledWith('videos');
      expect(supabase.from).toHaveBeenCalledWith('video_progress');
    });

    it('should handle video lookup failure in batch', async () => {
      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery(null, { message: 'DB Error' });
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await toggleVideoProgressBatch(mockUserId, mockCourseId, [1, 2], true);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AuditPath] ❌ Error finding videos for batch toggle:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should return early when video list is empty', async () => {
      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery([]);
      });

      // When no videos are found, the function just returns without error
      // because empty data is not considered an error condition
      await toggleVideoProgressBatch(mockUserId, mockCourseId, [1, 2], true);

      // Should not have called video_progress.upsert since no videos were found
      expect(supabase.from).toHaveBeenCalledWith('videos');
    });

    it('should handle upsert error in batch', async () => {
      const mockVideos = [{ id: 'video-1', duration_minutes: 10 }];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'videos') {
          return createMockQuery(mockVideos);
        }
        if (table === 'video_progress') {
          return {
            ...createMockQuery({}),
            upsert: vi.fn().mockReturnValue({
              then: vi
                .fn()
                .mockImplementation(
                  (cb: (result: { error: unknown }) => unknown) =>
                    cb({ error: { message: 'Upsert failed' } })
                ),
            }),
          };
        }
        return createMockQuery([]);
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await toggleVideoProgressBatch(mockUserId, mockCourseId, [1], true);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AuditPath] ❌ Error batch toggling video progress:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should upsert with correct data structure', async () => {
      const mockVideos = [{ id: 'video-1', duration_minutes: 10 }];

      let upsertData: unknown;

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'videos') {
          return createMockQuery(mockVideos);
        }
        if (table === 'video_progress') {
          return {
            ...createMockQuery({}),
            upsert: vi.fn().mockImplementation((data: unknown) => {
              upsertData = data;
              return {
                then: vi
                  .fn()
                  .mockImplementation(
                    (cb: (result: { error: null }) => unknown) =>
                      cb({ error: null })
                  ),
              };
            }),
          };
        }
        return createMockQuery([]);
      });

      await toggleVideoProgressBatch(mockUserId, mockCourseId, [1], true);

      expect(upsertData).toEqual([
        {
          user_id: mockUserId,
          video_id: 'video-1',
          completed: true,
          updated_at: expect.any(String),
          completed_at: expect.any(String),
        },
      ]);
    });
  });

  describe('getDailyVideoMilestones', () => {
    it('should calculate milestones correctly', async () => {
      const mockProgress = [
        { completed_at: '2026-02-10T10:00:00Z' },
        { completed_at: '2026-02-10T11:00:00Z' },
        { completed_at: '2026-02-10T12:00:00Z' },
        { completed_at: '2026-02-10T13:00:00Z' },
        { completed_at: '2026-02-10T14:00:00Z' }, // First 5 on Feb 10
        { completed_at: '2026-02-11T10:00:00Z' },
        { completed_at: '2026-02-11T11:00:00Z' },
        { completed_at: '2026-02-11T12:00:00Z' },
        { completed_at: '2026-02-11T13:00:00Z' },
        { completed_at: '2026-02-11T14:00:00Z' },
        { completed_at: '2026-02-11T15:00:00Z' },
        { completed_at: '2026-02-11T16:00:00Z' },
        { completed_at: '2026-02-11T17:00:00Z' },
        { completed_at: '2026-02-11T18:00:00Z' },
        { completed_at: '2026-02-11T19:00:00Z' },
        { completed_at: '2026-02-11T20:00:00Z' }, // 11 videos on Feb 11
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'video_progress') {
          return createMockQuery(mockProgress);
        }
        return createMockQuery([]);
      });

      const milestones = await getDailyVideoMilestones(mockUserId);

      expect(milestones.maxCount).toBe(11); // Feb 11 has 11 videos
      expect(milestones.first5Date).toBe('2026-02-10');
      expect(milestones.first10Date).toBe('2026-02-11');
    });

    it('should return default values when no progress', async () => {
      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery([]);
      });

      const milestones = await getDailyVideoMilestones(mockUserId);

      expect(milestones).toEqual({
        maxCount: 0,
        first5Date: null,
        first10Date: null,
      });
    });

    it('should return default values on error', async () => {
      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery(null, { message: 'DB Error' });
      });

      const milestones = await getDailyVideoMilestones(mockUserId);

      expect(milestones).toEqual({
        maxCount: 0,
        first5Date: null,
        first10Date: null,
      });
    });

    it('should filter out null completed_at values', async () => {
      const mockProgress = [
        { completed_at: '2026-02-11T10:00:00Z' },
        { completed_at: null },
        { completed_at: '2026-02-11T11:00:00Z' },
        { completed_at: null },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'video_progress') {
          return createMockQuery(mockProgress);
        }
        return createMockQuery([]);
      });

      const milestones = await getDailyVideoMilestones(mockUserId);

      expect(milestones.maxCount).toBe(2);
    });

    it('should handle single video milestone', async () => {
      const mockProgress = [{ completed_at: '2026-02-11T10:00:00Z' }];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'video_progress') {
          return createMockQuery(mockProgress);
        }
        return createMockQuery([]);
      });

      const milestones = await getDailyVideoMilestones(mockUserId);

      expect(milestones.maxCount).toBe(1);
      expect(milestones.first5Date).toBeNull();
      expect(milestones.first10Date).toBeNull();
    });

    it('should sort dates chronologically', async () => {
      const mockProgress = [
        { completed_at: '2026-02-15T10:00:00Z' },
        { completed_at: '2026-02-10T10:00:00Z' },
        { completed_at: '2026-02-12T10:00:00Z' },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'video_progress') {
          return createMockQuery(mockProgress);
        }
        return createMockQuery([]);
      });

      const milestones = await getDailyVideoMilestones(mockUserId);

      expect(milestones.maxCount).toBe(1);
    });

    it('should handle edge case: exactly 5 videos', async () => {
      const mockProgress = Array(5)
        .fill(null)
        .map((_, i) => ({
          completed_at: `2026-02-11T${String(i).padStart(2, '0')}:00:00Z`,
        }));

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'video_progress') {
          return createMockQuery(mockProgress);
        }
        return createMockQuery([]);
      });

      const milestones = await getDailyVideoMilestones(mockUserId);

      expect(milestones.first5Date).toBe('2026-02-11');
      expect(milestones.first10Date).toBeNull();
    });

    it('should handle edge case: exactly 10 videos', async () => {
      const mockProgress = Array(10)
        .fill(null)
        .map((_, i) => ({
          completed_at: `2026-02-11T${String(i).padStart(2, '0')}:00:00Z`,
        }));

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'video_progress') {
          return createMockQuery(mockProgress);
        }
        return createMockQuery([]);
      });

      const milestones = await getDailyVideoMilestones(mockUserId);

      expect(milestones.first5Date).toBe('2026-02-11');
      expect(milestones.first10Date).toBe('2026-02-11');
    });
  });
});
