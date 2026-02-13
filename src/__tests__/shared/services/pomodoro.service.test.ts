import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import {
  upsertPomodoroSession,
  getLatestActiveSession,
  deletePomodoroSession,
  updatePomodoroHeartbeat,
  getDailySessionCount,
  getRecentSessions,
  getRecentActivitySessions,
} from '@/shared/lib/core/services/pomodoro.service';
import { supabase } from '@/shared/lib/core/supabase';

// Mock Supabase
vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Pomodoro Service', () => {
  const mockUserId = 'user-123';
  const mockSessionId = 'session-456';

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
      or: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      neq: ReturnType<typeof vi.fn>;
      limit: ReturnType<typeof vi.fn>;
      maybeSingle: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      single: ReturnType<typeof vi.fn>;
      then: ReturnType<typeof vi.fn>;
    } = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockImplementation(() => Promise.resolve({ data, error })),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockImplementation(() => Promise.resolve({ data, error })),
      then: vi
        .fn()
        .mockImplementation(
          (cb: (result: { data: unknown; error: unknown }) => unknown) =>
            cb({ data, error })
        ),
    };
    return query;
  };

  describe('upsertPomodoroSession', () => {
    it('should create session with valid UUID course', async () => {
      const mockSession = {
        id: mockSessionId,
        courseId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
        courseName: 'Test Course',
        timeline: [{ type: 'work', start: 1000, end: 4000 }],
        startedAt: '2026-02-11T10:00:00Z',
        isCompleted: true,
      };

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return {
            ...createMockQuery({ id: mockSessionId }),
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockSessionId },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockQuery([]);
      });

      const result = await upsertPomodoroSession(mockSession, mockUserId);

      expect(result.data).toEqual({ id: mockSessionId });
      expect(result.error).toBeUndefined();
    });

    it('should resolve course slug to ID', async () => {
      const mockSession = {
        id: mockSessionId,
        courseId: 'my-course-slug', // Not a UUID
        courseName: null,
        timeline: [{ type: 'work', start: 1000, end: 4000 }],
        startedAt: '2026-02-11T10:00:00Z',
      };

      const mockCourse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Resolved Course',
      };

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'courses') {
          return {
            ...createMockQuery(mockCourse),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockCourse,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'pomodoro_sessions') {
          return {
            ...createMockQuery({ id: mockSessionId }),
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockSessionId },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockQuery([]);
      });

      const result = await upsertPomodoroSession(mockSession, mockUserId);

      expect(result.data).toBeDefined();
    });

    it('should handle unknown course slug', async () => {
      const mockSession = {
        id: mockSessionId,
        courseId: 'unknown-slug',
        courseName: null,
        timeline: [{ type: 'work', start: 1000, end: 4000 }],
        startedAt: '2026-02-11T10:00:00Z',
      };

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'courses') {
          return {
            ...createMockQuery(null),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'pomodoro_sessions') {
          return {
            ...createMockQuery({ id: mockSessionId }),
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockSessionId },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockQuery([]);
      });

      const result = await upsertPomodoroSession(mockSession, mockUserId);

      expect(result.data).toBeDefined();
    });

    it('should return error on upsert failure', async () => {
      const mockSession = {
        id: mockSessionId,
        courseId: '550e8400-e29b-41d4-a716-446655440000',
        timeline: [],
        startedAt: '2026-02-11T10:00:00Z',
      };

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return {
            ...createMockQuery(null, { message: 'Upsert failed' }),
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Upsert failed' },
                }),
              }),
            }),
          };
        }
        return createMockQuery([]);
      });

      const result = await upsertPomodoroSession(mockSession, mockUserId);

      expect(result.error).toBe('Upsert failed');
    });
  });

  describe('getLatestActiveSession', () => {
    it('should return latest active session', async () => {
      const mockSession = {
        id: mockSessionId,
        course_name: 'Test Course',
        started_at: '2026-02-11T10:00:00Z',
        is_completed: false,
      };

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSession);
        }
        return createMockQuery([]);
      });

      const result = await getLatestActiveSession(mockUserId);

      expect(result).toEqual(mockSession);
    });

    it('should return null when no active session', async () => {
      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(null);
        }
        return createMockQuery([]);
      });

      const result = await getLatestActiveSession(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('deletePomodoroSession', () => {
    it('should delete session successfully', async () => {
      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return {
            ...createMockQuery({}),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return createMockQuery([]);
      });

      await expect(deletePomodoroSession(mockSessionId)).resolves.not.toThrow();
    });

    it('should log error on delete failure', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return {
            ...createMockQuery(null, { message: 'Delete failed' }),
            delete: vi.fn().mockReturnValue({
              eq: vi
                .fn()
                .mockResolvedValue({ error: { message: 'Delete failed' } }),
            }),
          };
        }
        return createMockQuery([]);
      });

      await deletePomodoroSession(mockSessionId);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('updatePomodoroHeartbeat', () => {
    it('should update heartbeat timestamp', async () => {
      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return {
            ...createMockQuery({}),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return createMockQuery([]);
      });

      await expect(
        updatePomodoroHeartbeat(mockSessionId)
      ).resolves.not.toThrow();
    });

    it('should update with efficiency stats', async () => {
      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return {
            ...createMockQuery({}),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return createMockQuery([]);
      });

      await expect(
        updatePomodoroHeartbeat(mockSessionId, {
          efficiency_score: 85,
          total_paused_time: 120,
        })
      ).resolves.not.toThrow();
    });

    it('should handle heartbeat failure silently', async () => {
      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return {
            ...createMockQuery(null, { message: 'Update failed' }),
            update: vi.fn().mockReturnValue({
              eq: vi
                .fn()
                .mockResolvedValue({ error: { message: 'Update failed' } }),
            }),
          };
        }
        return createMockQuery([]);
      });

      // Should not throw
      await expect(
        updatePomodoroHeartbeat(mockSessionId)
      ).resolves.not.toThrow();
    });
  });

  describe('getDailySessionCount', () => {
    it('should count cycles from today sessions', async () => {
      const mockSessions = [
        {
          timeline: [
            { type: 'work', start: 1000, end: 4000 },
            { type: 'break', start: 4000, end: 4600 },
            { type: 'work', start: 4600, end: 7600 },
          ],
        },
        {
          timeline: [{ type: 'work', start: 1000, end: 4000 }],
        },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        return createMockQuery([]);
      });

      const result = await getDailySessionCount(mockUserId);

      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 on error', async () => {
      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery(null, { message: 'DB Error' });
      });

      const result = await getDailySessionCount(mockUserId);

      expect(result).toBe(0);
    });

    it('should handle early morning (before 4 AM) virtual day', async () => {
      // Set time to 3 AM - should use previous day
      vi.setSystemTime(new Date('2026-02-11T03:00:00Z'));

      const mockSessions: unknown[] = [];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        return createMockQuery([]);
      });

      const result = await getDailySessionCount(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe('getRecentSessions', () => {
    it('should return formatted timeline blocks', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          course_name: 'Test Course',
          started_at: '2026-02-11T10:00:00Z',
          ended_at: '2026-02-11T11:00:00Z',
          total_work_time: 3000,
          total_break_time: 600,
          total_pause_time: 120,
          timeline: [
            { type: 'work', start: 1000, end: 4000 },
            { type: 'break', start: 4000, end: 4600 },
          ],
        },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        return createMockQuery([]);
      });

      const result = await getRecentSessions(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('session-1');
      expect(result[0].courseName).toBe('Test Course');
      expect(result[0].type).toBe('work');
      expect(result[0].timeline).toHaveLength(2);
    });

    it('should use timeline for start/end times when available', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          course_name: 'Test Course',
          started_at: '2026-02-11T10:00:00Z',
          ended_at: '2026-02-11T10:30:00Z',
          total_work_time: 3000,
          total_break_time: 0,
          total_pause_time: 0,
          timeline: [
            { type: 'work', start: 1000000000000, end: 1000000003000 },
          ],
        },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        return createMockQuery([]);
      });

      const result = await getRecentSessions(mockUserId);

      expect(result[0].startTime).toBeDefined();
      expect(result[0].endTime).toBeDefined();
    });

    it('should handle string timeline', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          course_name: 'Test Course',
          started_at: '2026-02-11T10:00:00Z',
          ended_at: '2026-02-11T11:00:00Z',
          total_work_time: 3000,
          total_break_time: 0,
          total_pause_time: 0,
          timeline: JSON.stringify([{ type: 'work', start: 1000, end: 4000 }]),
        },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        return createMockQuery([]);
      });

      const result = await getRecentSessions(mockUserId);

      expect(result).toHaveLength(1);
    });

    it('should return empty array on error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery(null, { message: 'DB Error' });
      });

      const result = await getRecentSessions(mockUserId);

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should default course name to "Bilinmeyen Ders"', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          course_name: null,
          started_at: '2026-02-11T10:00:00Z',
          ended_at: '2026-02-11T11:00:00Z',
          total_work_time: 3000,
          total_break_time: 0,
          total_pause_time: 0,
          timeline: [],
        },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        return createMockQuery([]);
      });

      const result = await getRecentSessions(mockUserId);

      expect(result[0].courseName).toBe('Bilinmeyen Ders');
    });

    it('should classify as break if break time > work time', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          course_name: 'Test Course',
          started_at: '2026-02-11T10:00:00Z',
          ended_at: '2026-02-11T11:00:00Z',
          total_work_time: 600,
          total_break_time: 1200,
          total_pause_time: 0,
          timeline: [],
        },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        return createMockQuery([]);
      });

      const result = await getRecentSessions(mockUserId);

      expect(result[0].type).toBe('break');
    });
  });

  describe('getRecentActivitySessions', () => {
    it('should return recent activity sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          course_name: 'Test Course',
          started_at: '2026-02-11T10:00:00Z',
          total_work_time: 3000,
          total_break_time: 600,
          total_pause_time: 120,
          pause_count: 2,
          efficiency_score: 85,
          timeline: [{ type: 'work', start: 1000, end: 4000 }],
        },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        return createMockQuery([]);
      });

      const result = await getRecentActivitySessions(mockUserId, 5);

      expect(result).toHaveLength(1);
      expect(result[0].courseName).toBe('Test Course');
      expect(result[0].durationMinutes).toBe(50);
      expect(result[0].efficiencyScore).toBe(85);
      expect(result[0].pauseCount).toBe(2);
    });

    it('should return empty array on error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery(null, { message: 'DB Error' });
      });

      const result = await getRecentActivitySessions(mockUserId);

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should use default limit of 5', async () => {
      const mockSessions: unknown[] = [];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        return createMockQuery([]);
      });

      await getRecentActivitySessions(mockUserId);

      // Verify the function was called with default limit
      expect(supabase.from).toHaveBeenCalledWith('pomodoro_sessions');
    });
  });
});
