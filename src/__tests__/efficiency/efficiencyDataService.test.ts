import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import {
  getDailyEfficiencySummary,
  getEfficiencyTrend,
  getFocusPowerData,
  getLearningLoadData,
} from '@/features/efficiency/services/efficiencyDataService';
import type { LearningLoad } from '@/features/efficiency/types/efficiencyTypes';
import { getVirtualDateKey } from '@/utils/dateUtils';
import * as efficiencyHelpers from '@/features/efficiency/logic/efficiencyHelpers';
import { supabase } from '@/lib/supabase';

const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null, count: null }),
};

// Mock the dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
  },
}));

vi.mock('@/lib/supabaseHelpers', () => ({
  handleSupabaseError: vi.fn(),
  safeQuery: vi.fn(),
}));

// We need to mock fetchSessionHistory since it's an unexported utility in the same file
// Unfortunately, Vitest module mocking doesn't easily mock unexported functions.
// As a workaround, we'll mock the internal call from `safeQuery` and `supabase.from`
// However, the test prompt says "fetchSessionHistory fonksiyonunu mock'la", which
// might imply we can module-mock the whole service and spy on it, or mock the underlying DB.
// Let's mock Supabase instead, which achieves the exact same result.

import { safeQuery } from '@/lib/supabaseHelpers';

describe('efficiencyDataService - Day Filtering Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLearningLoadData', () => {
    it('should filter out Tuesday (2), Wednesday (3), and Thursday (4)', async () => {
      // Mock 7 gün: Pazartesi (1) ile Pazar (0)
      // 2024-01-01 -> Pazartesi
      // 2024-01-02 -> Salı
      // 2024-01-03 -> Çarşamba
      // 2024-01-04 -> Perşembe
      // 2024-01-05 -> Cuma
      // 2024-01-06 -> Cumartesi
      // 2024-01-07 -> Pazar

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-07T14:00:00Z')); // Pazar günü

      // Salı, Çarşamba, Perşembe için veritabanında "veri olsa bile" elendiğini görmek için
      // Her güne veri ekliyoruz.
      const mockSessions = [
        { started_at: '2024-01-01T10:00:00Z', total_work_time: 3600 }, // Pzt
        { started_at: '2024-01-02T10:00:00Z', total_work_time: 3600 }, // Sal
        { started_at: '2024-01-03T10:00:00Z', total_work_time: 3600 }, // Çar
        { started_at: '2024-01-04T10:00:00Z', total_work_time: 3600 }, // Per
        { started_at: '2024-01-05T10:00:00Z', total_work_time: 3600 }, // Cum
        { started_at: '2024-01-06T10:00:00Z', total_work_time: 3600 }, // Cmt
        { started_at: '2024-01-07T10:00:00Z', total_work_time: 3600 }, // Paz
      ];

      (safeQuery as Mock).mockResolvedValue({ data: mockSessions });

      const result = await getLearningLoadData({
        userId: 'user-1',
        days: 7,
      });

      // Cmt ve Paz veri var, Pzt, Cum veri var -> Bunlar kalır.
      // Sal, Çar, Per -> Elenmeli
      expect(result.length).toBe(4); // Pzt, Cum, Cmt, Paz

      const daysInResult = result.map((r: LearningLoad) => r.rawDate!.getDay());
      expect(daysInResult).not.toContain(2); // Salı olmamalı
      expect(daysInResult).not.toContain(3); // Çarşamba olmamalı
      expect(daysInResult).not.toContain(4); // Perşembe olmamalı
      expect(daysInResult).toContain(1); // Pazartesi olmalı
      expect(daysInResult).toContain(5); // Cuma olmalı

      vi.useRealTimers();
    });

    it('should remove weekend days if totalMins is 0, but keep them if > 0', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-07T14:00:00Z')); // Pazar günü

      // Sadece Pazar gününe çalışılmış, Cumartesi boş.
      const mockSessions = [
        { started_at: '2024-01-01T10:00:00Z', total_work_time: 3600 }, // Pzt
        { started_at: '2024-01-07T10:00:00Z', total_work_time: 3600 }, // Paz - veri var
        // Cumartesi (2024-01-06) için event yok => 0 mins
      ];

      (safeQuery as Mock).mockResolvedValue({ data: mockSessions });

      const result = await getLearningLoadData({
        userId: 'user-1',
        days: 7,
      });

      const daysInResult = result.map((r: LearningLoad) => r.rawDate!.getDay());
      // Pazar (0) verisi var, listede kalmalı
      expect(daysInResult).toContain(0);

      // Cumartesi (6) verisi yok, listeden çıkarılmalı
      expect(daysInResult).not.toContain(6);

      vi.useRealTimers();
    });
    it('should remove BOTH Saturday and Sunday if totalMins is 0 for both (KEEP SUNDAY TO BREAK STREAK)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-07T14:00:00Z')); // Pazar günü

      // Sadece Cuma gününe kadar çalışılmış. Cumartesi ve Pazar boş.
      const mockSessions = [
        { started_at: '2024-01-01T10:00:00Z', total_work_time: 3600 }, // Pzt
        { started_at: '2024-01-05T10:00:00Z', total_work_time: 3600 }, // Cuma
      ];

      (safeQuery as Mock).mockResolvedValue({ data: mockSessions });

      const result = await getLearningLoadData({
        userId: 'user-1',
        days: 7,
      });

      const daysInResult = result.map((r: LearningLoad) => r.rawDate!.getDay());

      // Yeni kural uyarınca: Eğer 2 günü de çalışmadıysa 1 gün tatil sayılır (Cumartesi silinir),
      // Fakat Pazar günü disiplin cezası olarak listede "0" değer ile KAPANMALI.
      expect(daysInResult).toContain(0);
      expect(daysInResult).not.toContain(6);

      // Sadece Pazartesi(1), Cuma(5) ve Pazar(0) listede olmalı
      expect(daysInResult).toContain(1);
      expect(daysInResult).toContain(5);
      expect(result.length).toBe(3);

      vi.useRealTimers();
    });
  });

  describe('getFocusPowerData', () => {
    it('should filter out Tuesday, Wednesday, and Thursday', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-07T14:00:00Z')); // Pazar günü

      const mockSessions = [
        { started_at: '2024-01-01T10:00:00Z', total_work_time: 3600 },
        { started_at: '2024-01-02T10:00:00Z', total_work_time: 3600 },
        { started_at: '2024-01-03T10:00:00Z', total_work_time: 3600 },
        { started_at: '2024-01-04T10:00:00Z', total_work_time: 3600 },
        { started_at: '2024-01-05T10:00:00Z', total_work_time: 3600 },
        { started_at: '2024-01-06T10:00:00Z', total_work_time: 3600 },
        { started_at: '2024-01-07T10:00:00Z', total_work_time: 3600 },
      ];

      (safeQuery as Mock).mockResolvedValue({ data: mockSessions });

      const result = await getFocusPowerData({
        userId: 'user-1',
        range: 'week',
      });

      expect(result.length).toBe(4);

      const datesInResult = result.map((r) =>
        new Date(r.originalDate).getDay()
      );
      expect(datesInResult).not.toContain(2);
      expect(datesInResult).not.toContain(3);
      expect(datesInResult).not.toContain(4);
      expect(datesInResult).toContain(1);
      expect(datesInResult).toContain(5);

      vi.useRealTimers();
    });

    it('should remove weekend days if there is no activity, but keep them if > 0', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-07T14:00:00Z')); // Pazar günü

      const mockSessions = [
        { started_at: '2024-01-01T10:00:00Z', total_work_time: 3600 }, // Pzt
        { started_at: '2024-01-06T10:00:00Z', total_work_time: 7200 }, // Cmt (veri var)
        // 2024-01-07 Pazar verisi YOK
      ];

      (safeQuery as Mock).mockResolvedValue({ data: mockSessions });

      const result = await getFocusPowerData({
        userId: 'user-1',
        range: 'week',
      });

      const datesInResult = result.map((r) =>
        new Date(r.originalDate).getDay()
      );

      // Cmt verisi var, listede kalmalı
      expect(datesInResult).toContain(6);

      // Paz verisi yok, listeden çıkarılmalı
      expect(datesInResult).not.toContain(0);

      vi.useRealTimers();
    });
  });

  describe('getDailyEfficiencySummary - Null & Error Resilience', () => {
    it('should safely convert null values from Supabase to 0 without crashing', async () => {
      // Mock a typical faulty/incomplete database row where most numeric fields return null
      const mockCorruptedSession = [
        {
          id: 'session-123',
          course_name: null,
          started_at: '2024-01-01T10:00:00Z',
          total_work_time: null,
          total_break_time: null,
          total_pause_time: null,
          pause_count: null,
          efficiency_score: null,
          timeline: null, // No timeline either
        },
      ];

      // Re-mocking supabase.from().select().eq().gte().lt().or().order() resolution
      (mockSupabaseChain.order as Mock).mockResolvedValue({
        data: mockCorruptedSession,
        error: null,
      });

      const summary = await getDailyEfficiencySummary('user-1');

      // Assert totals default cleanly to 0 rather than NaN or null
      expect(summary.netWorkTimeSeconds).toBe(0);
      expect(summary.totalBreakTimeSeconds).toBe(0);
      expect(summary.totalPauseTimeSeconds).toBe(0);
      expect(summary.pauseCount).toBe(0);
      expect(summary.efficiencyScore).toBe(0); // Focus Power Calc fallback
      expect(summary.totalCycles).toBe(0);

      // Assert internal DetailedSession safely maps to explicit defaults
      expect(summary.sessions.length).toBe(1);
      const detailed = summary.sessions[0];

      expect(detailed.courseName).toBe('Bilinmeyen Ders'); // fallback applied
      expect(detailed.workTimeSeconds).toBe(0);
      expect(detailed.breakTimeSeconds).toBe(0);
      expect(detailed.pauseTimeSeconds).toBe(0);
      expect(detailed.efficiencyScore).toBe(0);
      expect(detailed.timeline).toEqual([]); // fallback applied
    });

    it('should filter out invalid elements from timeline array based on TimelineEventSchema', async () => {
      const mockCorruptedTimelineSession = [
        {
          id: 'session-124',
          course_name: 'Audit',
          started_at: '2024-01-01T10:00:00Z',
          total_work_time: 3600,
          total_break_time: 300,
          total_pause_time: 0,
          pause_count: 0,
          efficiency_score: 95,
          timeline: [
            { type: 'work', start: 1000, end: 2000 },
            null, // Unexpected null in array
            'im a string instead of object', // Unexpected string format
            { wrong_type: 'foo' }, // Missing required properties
            { type: 'invalid_type', start: 1000 }, // Schema expects specific literal string types
            { type: 'break', start: 1500 }, // Valid
          ],
        },
      ];

      (mockSupabaseChain.order as Mock).mockResolvedValue({
        data: mockCorruptedTimelineSession,
        error: null,
      });

      // App shouldn't crash
      const summary = await getDailyEfficiencySummary('user-1');
      const detailed = summary.sessions[0];

      // Only the valid typed timeline event should survive mapping
      // Note: cycleCount logic handles internal strings safely too without crashing
      expect(detailed.timeline.length).toBe(2);
      expect((detailed.timeline[0] as { type: string }).type).toBe('work');
      expect((detailed.timeline[1] as { type: string }).type).toBe('break');
    });

    it('should return an empty list if timeline array is empty', async () => {
      const mockEmptyTimelineSession = [
        {
          id: 'session-125',
          course_name: 'Audit 2',
          started_at: '2024-01-01T10:00:00Z',
          total_work_time: 3600,
          total_break_time: 0,
          total_pause_time: 0,
          pause_count: 0,
          efficiency_score: 100,
          timeline: [], // Empty array
        },
      ];

      (mockSupabaseChain.order as Mock).mockResolvedValue({
        data: mockEmptyTimelineSession,
        error: null,
      });
      const summary = await getDailyEfficiencySummary('user-1');
      const detailed = summary.sessions[0];

      expect(detailed.timeline.length).toBe(0);
      expect(detailed.timeline).toEqual([]);
    });
  });

  describe('getEfficiencyTrend - Video & Pomodoro Merge', () => {
    it('should correctly merge video durations and pomodoro work times and pass them to calculateEfficiencyScore', async () => {
      // Spy on the calculateEfficiencyScore so we can verify the exact arguments passed
      const calculateSpy = vi.spyOn(
        efficiencyHelpers,
        'calculateEfficiencyScore'
      );

      vi.useFakeTimers();
      const mockToday = new Date('2024-01-01T14:00:00Z'); // Pazartesi
      vi.setSystemTime(mockToday);

      // 1) Mock: 1 Pomodoro session for today (60 mins = 3600 seconds)
      const mockPomodoroSessions = [
        {
          started_at: mockToday.toISOString(),
          total_work_time: 3600, // 60 mins
        },
      ];

      // 2) Mock: 2 Video sessions for today (20 + 20 = 40 mins)
      const mockVideoProgress = [
        {
          completed_at: mockToday.toISOString(),
          video: { duration_minutes: 20 },
        },
        {
          completed_at: mockToday.toISOString(),
          video: [{ duration_minutes: 20 }], // Tests the array-wrapping schema capability
        },
      ];

      (safeQuery as Mock).mockResolvedValue({
        data: mockPomodoroSessions,
        error: null,
      });

      // Mock the direct Supabase call for video_progress
      const mockVideoChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({
          data: mockVideoProgress,
          error: null,
        }),
      };

      // Since safeQuery uses supabase.from too, we need to conditionally return based on table name
      // but our mockChain from before returns the order chain. Let's make it simpler:
      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'video_progress') return mockVideoChain;
        return mockSupabaseChain; // Used by fetchSessionHistory
      });

      const trends = await getEfficiencyTrend('user-1');

      // Verify mapping: 40 mins video, 60 mins work
      expect(calculateSpy).toHaveBeenCalledWith(40, 60);

      // Verify the result matches expectations
      const todayResult = trends.find(
        (t: { date: string }) => t.date === getVirtualDateKey(mockToday)
      );
      expect(todayResult).toBeDefined();
      expect(todayResult!.workMinutes).toBe(60);
      expect(todayResult!.videoMinutes).toBe(40);

      calculateSpy.mockRestore();
      vi.useRealTimers();
    });
  });
});
