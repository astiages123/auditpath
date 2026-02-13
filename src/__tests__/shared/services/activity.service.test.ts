import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import * as activityService from '@/shared/lib/core/services/activity.service';
import { supabase } from '@/shared/lib/core/supabase';
import { getCycleCount } from '@/shared/lib/core/utils/efficiency-math';

// Mock Supabase
vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock efficiency-math
vi.mock('@/shared/lib/core/utils/efficiency-math', () => ({
  getCycleCount: vi.fn(),
}));

describe('Activity Service Tests', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-11T12:00:00Z'));
  });

  const createMockQuery = (data: unknown, error: unknown = null) => {
    const query: {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      gte: ReturnType<typeof vi.fn>;
      lt: ReturnType<typeof vi.fn>;
      not: ReturnType<typeof vi.fn>;
      or: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      limit: ReturnType<typeof vi.fn>;
      insert: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      then: ReturnType<typeof vi.fn>;
    } = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      then: vi
        .fn()
        .mockImplementation(
          (cb: (result: { data: unknown; error: unknown }) => unknown) =>
            cb({ data, error })
        ),
    };
    return query;
  };

  describe('getDailyStats', () => {
    it('should calculate daily stats correctly with trend and video stats', async () => {
      const mockTodaySessions = [
        {
          total_work_time: 1200,
          total_break_time: 300,
          total_pause_time: 60,
          timeline: [],
        },
      ];
      const mockYesterdaySessions = [{ total_work_time: 600 }];
      const mockTodayVideos = [
        { video_id: 'v1', video: { duration_minutes: 10 } },
        { video_id: 'v2', video: { duration_minutes: 20 } },
      ];
      const mockYesterdayVideos = [
        {
          video_id: 'v3',
          video: { duration_minutes: 10 },
        },
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        const q = createMockQuery([]);
        if (table === 'pomodoro_sessions') {
          q.lt = vi.fn().mockImplementation((_name, val) => {
            // Yesterday's lt is today's start (02-11)
            if (val.includes('2026-02-11')) {
              return createMockQuery(mockYesterdaySessions);
            }
            return {
              or: vi
                .fn()
                .mockImplementation(() => createMockQuery(mockTodaySessions)),
            };
          });
          return q;
        }
        if (table === 'video_progress') {
          q.lt = vi.fn().mockImplementation((_name, val) => {
            // Today's lt is tomorrow's start (02-12)
            if (val.includes('2026-02-12')) {
              return createMockQuery(mockTodayVideos);
            }
            return createMockQuery(mockYesterdayVideos);
          });
          return q;
        }
        return q;
      });

      (getCycleCount as Mock).mockReturnValue(1);

      const stats = await activityService.getDailyStats(mockUserId);

      expect(stats.totalWorkMinutes).toBe(20);
      expect(stats.totalBreakMinutes).toBe(5);
      expect(stats.trendPercentage).toBe(100);
      expect(stats.totalVideoMinutes).toBe(30);
      expect(stats.videoTrendPercentage).toBe(100);
    });

    it('should handle virtual day logic (before 04:00 AM)', async () => {
      // 03:00 AM Local (+03:00) -> 00:00:00Z
      vi.setSystemTime(new Date('2026-02-11T00:00:00Z'));
      (supabase.from as Mock).mockImplementation(() => createMockQuery([]));

      await activityService.getDailyStats(mockUserId);
      expect(supabase.from).toHaveBeenCalledWith('pomodoro_sessions');
    });

    it('should handle zero yesterday work minutes', async () => {
      (supabase.from as Mock).mockImplementation((table) => {
        const q = createMockQuery([]);
        if (table === 'pomodoro_sessions') {
          q.lt = vi.fn().mockImplementation((_name, val) => {
            if (val.includes('2026-02-11')) {
              return createMockQuery([]);
            }
            return {
              or: vi
                .fn()
                .mockImplementation(() =>
                  createMockQuery([{ total_work_time: 600 }])
                ),
            };
          });
          return q;
        }
        return q;
      });

      const stats = await activityService.getDailyStats(mockUserId);
      expect(stats.trendPercentage).toBe(100);
    });

    it('should log error when fetching today sessions fails', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockError = { message: 'DB Error' };
      (supabase.from as Mock).mockImplementation(() => {
        const q = createMockQuery(null, mockError);
        q.or = vi
          .fn()
          .mockImplementation(() => createMockQuery(null, mockError));
        return q;
      });

      await activityService.getDailyStats(mockUserId);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AuditPath] ❌ Error fetching daily stats:',
        mockError
      );
      consoleSpy.mockRestore();
    });
  });

  describe('getLast30DaysActivity', () => {
    it('should calculate heatmap correctly', async () => {
      const mockData = [
        { started_at: '2026-02-11T12:00:00Z', total_work_time: 3600 },
        { started_at: '2026-02-10T12:00:00Z', total_work_time: 3600 },
      ];
      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));
      const heatmap = await activityService.getLast30DaysActivity(mockUserId);
      expect(heatmap).toHaveLength(31);
      expect(heatmap.find((h) => h.date === '2026-02-11')?.count).toBe(1);
    });

    it('should return levels based on counts', async () => {
      const mockData = Array(10).fill({
        started_at: '2026-02-11T12:00:00Z',
        total_work_time: 60,
      });
      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));
      const heatmap = await activityService.getLast30DaysActivity(mockUserId);
      expect(heatmap.find((h) => h.date === '2026-02-11')?.level).toBe(4);
    });

    it('should handle error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Err' })
      );
      const heatmap = await activityService.getLast30DaysActivity(mockUserId);
      expect(heatmap).toEqual([]);
    });
  });

  describe('getCumulativeStats', () => {
    it('should calculate cumulative stats correctly', async () => {
      (supabase.from as Mock).mockImplementation((table) => {
        const data =
          table === 'pomodoro_sessions'
            ? [{ total_work_time: 3600 }]
            : [{ video_id: 'v1', video: { duration_minutes: 30 } }];
        return createMockQuery(data);
      });
      const stats = await activityService.getCumulativeStats(mockUserId);
      expect(stats.totalWorkMinutes).toBe(60);
      expect(stats.totalVideoMinutes).toBe(30);
    });

    it('should log error on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Err' })
      );
      await activityService.getCumulativeStats(mockUserId);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('getHistoryStats', () => {
    it('should group history stats correctly including video data edge cases', async () => {
      const mockSessions = [
        { started_at: '2026-02-11T12:00:00Z', total_work_time: 3600 },
        { started_at: '2026-02-10T22:00:00Z', total_work_time: 1800 },
      ];
      const mockVideos = [
        {
          completed_at: '2026-02-11T12:00:00Z',
          video: { duration_minutes: 30 },
        },
        { completed_at: '2026-02-11T12:00:00Z', video: {} }, // Missing duration
        { completed_at: null }, // Missing completed_at
        {
          completed_at: '2020-01-01T00:00:00Z',
          video: { duration_minutes: 10 },
        }, // Out of range
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        return createMockQuery(
          table === 'pomodoro_sessions' ? mockSessions : mockVideos
        );
      });

      const history = await activityService.getHistoryStats(mockUserId, 2);
      expect(history).toHaveLength(2);
      expect(history.find((h) => h.date === '2026-02-11')?.pomodoro).toBe(60);
      expect(history.find((h) => h.date === '2026-02-11')?.video).toBe(30);
    });

    it('should handle virtual day in getHistoryStats (before 04:00 AM)', async () => {
      vi.setSystemTime(new Date('2026-02-11T00:00:00Z')); // 03:00 AM local
      (supabase.from as Mock).mockImplementation(() => createMockQuery([]));

      const history = await activityService.getHistoryStats(mockUserId, 1);
      expect(history[0].date).toBe('2026-02-10');
    });

    it('should handle failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Err' })
      );
      await activityService.getHistoryStats(mockUserId);
    });
  });

  describe('logActivity', () => {
    it('should log activities', async () => {
      (supabase.from as Mock).mockReturnValue(createMockQuery({}));
      expect(
        await activityService.logActivity(mockUserId, 'pomodoro', {
          course_id: 'c1',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          timeline: [],
        })
      ).toBe(true);
      expect(
        await activityService.logActivity(mockUserId, 'video', {
          video_id: 'v1',
          course_id: 'c1',
          completed: true,
        })
      ).toBe(true);
      expect(
        await activityService.logActivity(mockUserId, 'quiz', {
          question_id: 'q1',
          course_id: 'c1',
          response_type: 'correct',
          session_number: 1,
        })
      ).toBe(true);
    });

    it('should handle failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Err' })
      );
      expect(
        await activityService.logActivity(mockUserId, 'pomodoro', {
          course_id: 'c1',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
        })
      ).toBe(false);
    });
  });

  describe('getRecentActivities', () => {
    it('should fetch recent activities including edge cases', async () => {
      (supabase.from as Mock).mockImplementation((table) => {
        const data =
          table === 'pomodoro_sessions'
            ? [
                {
                  id: 'p1',
                  started_at: '2026-02-11T10:00:00Z',
                  course_name: null,
                },
              ]
            : table === 'video_progress'
              ? [
                  {
                    id: 'v1',
                    completed_at: '2026-02-11T11:00:00Z',
                    video: null,
                  },
                ]
              : [
                  {
                    id: 'q1',
                    answered_at: '2026-02-11T09:00:00Z',
                    course: null,
                  },
                ];
        return createMockQuery(data);
      });
      const recent = await activityService.getRecentActivities(mockUserId, 5);
      expect(recent).toHaveLength(3);
      expect(recent[0].title).toBe('Video İzleme');
      expect(recent[1].title).toBe('Odaklanma Seansı');
      expect(recent[2].title).toBe('Konu Testi');
    });

    it('should handle empty results', async () => {
      (supabase.from as Mock).mockReturnValue(createMockQuery(null));
      expect(await activityService.getRecentActivities(mockUserId)).toEqual([]);
    });

    it('should handle errors', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (supabase.from as Mock).mockImplementation(() => {
        throw new Error('Err');
      });
      expect(await activityService.getRecentActivities(mockUserId)).toEqual([]);
    });
  });
});
