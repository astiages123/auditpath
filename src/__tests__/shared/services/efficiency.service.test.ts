import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import {
  getEfficiencyRatio,
  getFocusTrend,
  getEfficiencyTrend,
  getDailyEfficiencySummary,
} from '@/shared/lib/core/services/efficiency.service';
import { supabase } from '@/shared/lib/core/supabase';
import * as dateUtils from '@/shared/lib/utils/date-utils';

// Mock Supabase
vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock date utilities
vi.mock('@/shared/lib/utils/date-utils', () => ({
  getVirtualDayStart: vi.fn(),
  getVirtualDateKey: vi.fn(),
}));

describe('Efficiency Service', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-11T12:00:00Z'));

    // Default mock for getVirtualDayStart
    (dateUtils.getVirtualDayStart as Mock).mockReturnValue(
      new Date('2026-02-11T00:00:00Z')
    );
    (dateUtils.getVirtualDateKey as Mock).mockImplementation((date: Date) => {
      const d = date || new Date();
      return d.toISOString().split('T')[0];
    });
  });

  const createMockQuery = (data: unknown, error: unknown = null) => {
    const query: {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      gte: ReturnType<typeof vi.fn>;
      lt: ReturnType<typeof vi.fn>;
      or: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      then: ReturnType<typeof vi.fn>;
    } = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi
        .fn()
        .mockImplementation(
          (cb: (result: { data: unknown; error: unknown }) => unknown) =>
            cb({ data, error })
        ),
    };
    return query;
  };

  describe('getEfficiencyRatio', () => {
    it('should calculate efficiency ratio correctly', async () => {
      const mockSessions = [
        {
          total_work_time: 3600,
          total_break_time: 600,
          started_at: '2026-02-11T10:00:00Z',
          ended_at: '2026-02-11T11:00:00Z',
        },
      ];
      const mockVideos = [
        {
          video_id: 'v1',
          completed_at: '2026-02-11T10:30:00Z',
          video: { duration_minutes: 30 },
        },
      ];
      const mockQuiz: unknown[] = [];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        if (table === 'video_progress') {
          return createMockQuery(mockVideos);
        }
        if (table === 'user_quiz_progress') {
          return createMockQuery(mockQuiz);
        }
        return createMockQuery([]);
      });

      const result = await getEfficiencyRatio(mockUserId);

      expect(result.ratio).toBeGreaterThanOrEqual(0);
      expect(result.videoMinutes).toBe(30);
      expect(result.pomodoroMinutes).toBe(60);
    });

    it('should handle empty data', async () => {
      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery([]);
      });

      const result = await getEfficiencyRatio(mockUserId);

      expect(result.ratio).toBe(0);
      expect(result.videoMinutes).toBe(0);
      expect(result.pomodoroMinutes).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(null, { message: 'DB Error' });
        }
        return createMockQuery([]);
      });

      const result = await getEfficiencyRatio(mockUserId);

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.ratio).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should calculate efficiency ratio with high video time', async () => {
      const mockSessions = [
        {
          total_work_time: 600, // 10 minutes work
          total_break_time: 600,
          started_at: '2026-02-11T10:00:00Z',
          ended_at: '2026-02-11T10:20:00Z',
        },
      ];
      const mockVideos = [
        {
          video_id: 'v1',
          completed_at: '2026-02-11T10:30:00Z',
          video: { duration_minutes: 60 }, // 60 minutes video
        },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        if (table === 'video_progress') {
          return createMockQuery(mockVideos);
        }
        if (table === 'user_quiz_progress') {
          return createMockQuery([]);
        }
        return createMockQuery([]);
      });

      const result = await getEfficiencyRatio(mockUserId);

      expect(result.ratio).toBeGreaterThan(0);
      expect(result.videoMinutes).toBe(60);
    });

    it('should filter quiz sessions from work time', async () => {
      const mockSessions = [
        {
          total_work_time: 3600,
          total_break_time: 600,
          started_at: '2026-02-11T10:00:00Z',
          ended_at: '2026-02-11T11:00:00Z',
        },
      ];
      const mockVideos: unknown[] = [];
      const mockQuiz = [
        { answered_at: '2026-02-11T10:05:00Z' },
        { answered_at: '2026-02-11T10:10:00Z' },
        { answered_at: '2026-02-11T10:15:00Z' },
        { answered_at: '2026-02-11T10:20:00Z' },
        { answered_at: '2026-02-11T10:25:00Z' },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        if (table === 'video_progress') {
          return createMockQuery(mockVideos);
        }
        if (table === 'user_quiz_progress') {
          return createMockQuery(mockQuiz);
        }
        return createMockQuery([]);
      });

      const result = await getEfficiencyRatio(mockUserId);

      expect(result.quizMinutes).toBeGreaterThan(0);
    });

    it('should handle missing video duration', async () => {
      const mockSessions = [
        {
          total_work_time: 3600,
          total_break_time: 600,
          started_at: '2026-02-11T10:00:00Z',
          ended_at: '2026-02-11T11:00:00Z',
        },
      ];
      const mockVideos = [
        {
          video_id: 'v1',
          completed_at: '2026-02-11T10:30:00Z',
          video: null,
        },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        if (table === 'video_progress') {
          return createMockQuery(mockVideos);
        }
        if (table === 'user_quiz_progress') {
          return createMockQuery([]);
        }
        return createMockQuery([]);
      });

      const result = await getEfficiencyRatio(mockUserId);

      expect(result.videoMinutes).toBe(0);
    });
  });

  describe('getFocusTrend', () => {
    it('should calculate daily focus trend', async () => {
      const mockSessions = [
        { started_at: '2026-02-10T10:00:00Z', total_work_time: 3600 },
        { started_at: '2026-02-10T14:00:00Z', total_work_time: 1800 },
        { started_at: '2026-02-11T10:00:00Z', total_work_time: 2400 },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        return createMockQuery([]);
      });

      const result = await getFocusTrend(mockUserId);

      expect(result).toHaveLength(2); // 2 unique days
      expect(result[0].date).toBe('2026-02-10');
      expect(result[0].minutes).toBe(90); // 3600 + 1800 = 5400s = 90min
    });

    it('should return empty array on error', async () => {
      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery(null, { message: 'DB Error' });
      });

      const result = await getFocusTrend(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle 30 day window', async () => {
      const mockSessions = Array.from({ length: 40 }, (_, i) => ({
        started_at: `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        total_work_time: 3600,
      }));

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        return createMockQuery([]);
      });

      const result = await getFocusTrend(mockUserId);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getEfficiencyTrend', () => {
    it('should calculate efficiency trend with both work and video', async () => {
      const mockSessions = [
        { started_at: '2026-02-10T10:00:00Z', total_work_time: 3600 },
        { started_at: '2026-02-11T10:00:00Z', total_work_time: 1800 },
      ];
      const mockVideos = [
        {
          completed_at: '2026-02-10T12:00:00Z',
          video: { duration_minutes: 30 },
        },
        {
          completed_at: '2026-02-11T12:00:00Z',
          video: { duration_minutes: 20 },
        },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        if (table === 'video_progress') {
          return createMockQuery(mockVideos);
        }
        return createMockQuery([]);
      });

      const result = await getEfficiencyTrend(mockUserId);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('workMinutes');
      expect(result[0]).toHaveProperty('videoMinutes');
    });

    it('should return empty array on database error', async () => {
      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery(null, { message: 'DB Error' });
      });

      const result = await getEfficiencyTrend(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle video as array', async () => {
      const mockSessions = [
        { started_at: '2026-02-10T10:00:00Z', total_work_time: 3600 },
      ];
      const mockVideos = [
        {
          completed_at: '2026-02-10T12:00:00Z',
          video: [{ duration_minutes: 30 }],
        },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        if (table === 'video_progress') {
          return createMockQuery(mockVideos);
        }
        return createMockQuery([]);
      });

      const result = await getEfficiencyTrend(mockUserId);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getDailyEfficiencySummary', () => {
    it('should return comprehensive daily summary', async () => {
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

      const result = await getDailyEfficiencySummary(mockUserId);

      expect(result.efficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.totalCycles).toBeGreaterThanOrEqual(0);
      expect(result.netWorkTimeSeconds).toBe(3000);
      expect(result.totalBreakTimeSeconds).toBe(600);
      expect(result.totalPauseTimeSeconds).toBe(120);
      expect(result.pauseCount).toBe(2);
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].courseName).toBe('Test Course');
    });

    it('should handle missing session data', async () => {
      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery([]);
      });

      const result = await getDailyEfficiencySummary(mockUserId);

      expect(result.efficiencyScore).toBe(0);
      expect(result.sessions).toEqual([]);
    });

    it('should handle database error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      (supabase.from as Mock).mockImplementation(() => {
        return createMockQuery(null, { message: 'DB Error' });
      });

      const result = await getDailyEfficiencySummary(mockUserId);

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.sessions).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should use "Bilinmeyen Ders" for missing course name', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          course_name: null,
          started_at: '2026-02-11T10:00:00Z',
          total_work_time: 3000,
          total_break_time: 600,
          total_pause_time: 0,
          pause_count: 0,
          efficiency_score: 0,
          timeline: [],
        },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'pomodoro_sessions') {
          return createMockQuery(mockSessions);
        }
        return createMockQuery([]);
      });

      const result = await getDailyEfficiencySummary(mockUserId);

      expect(result.sessions[0].courseName).toBe('Bilinmeyen Ders');
    });
  });
});
