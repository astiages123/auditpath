import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { useEfficiencyData } from '@/features/efficiency/hooks/use-efficiency-data';
import { useAuth } from '@/features/auth/hooks/use-auth';
import * as clientDb from '@/shared/lib/core/client-db';
import { supabase } from '@/shared/lib/core/supabase';
import { calculateFocusPower } from '@/shared/lib/core/utils/efficiency-math';

// Mock dependencies
vi.mock('@/features/auth/hooks/use-auth');
vi.mock('@/shared/lib/core/client-db');
vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));
vi.mock('@/shared/lib/core/utils/efficiency-math', () => ({
  calculateFocusPower: vi.fn(),
  calculateFocusScore: vi.fn(),
  calculateLearningFlow: vi.fn(),
  calculatePauseCount: vi.fn(),
  calculateSessionTotals: vi.fn(),
  getCycleCount: vi.fn(),
  EFFICIENCY_THRESHOLDS: {
    STUCK: 0.25,
    DEEP: 0.75,
    OPTIMAL_MIN: 0.75,
    OPTIMAL_MAX: 1.25,
    SPEED: 1.75,
    SHALLOW: 1.75,
  },
}));

describe('useEfficiencyData Hook Tests', () => {
  const mockUser = { id: 'test-user-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    // Set a fixed date: Monday, Jan 1, 2024. 12:00 PM
    vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));

    (useAuth as Mock).mockReturnValue({ user: mockUser });

    // Default mocks for client-db
    (clientDb.getDailyEfficiencySummary as Mock).mockResolvedValue(null);
    (clientDb.getBloomStats as Mock).mockResolvedValue([]);
    (clientDb.getDailyStats as Mock).mockResolvedValue(null);
    (clientDb.getFocusTrend as Mock).mockResolvedValue([]);
    (clientDb.getCourseMastery as Mock).mockResolvedValue([]);
    (clientDb.getEfficiencyTrend as Mock).mockResolvedValue([]);
    (clientDb.getRecentActivitySessions as Mock).mockResolvedValue([]);
    (clientDb.getRecentQuizSessions as Mock).mockResolvedValue([]);
    (clientDb.getRecentCognitiveInsights as Mock).mockResolvedValue([]);

    // Custom mock for supabase to handle chaining
    const mockSelect = vi.fn();
    const mockEq = vi.fn();
    const mockGte = vi.fn();
    const mockNot = vi.fn();

    // Default return value for query finalization
    const mockResult = { data: [] };

    // Chainable Mock Helper
    const createChain = (data = mockResult) => {
      const chain = {
        select: mockSelect,
        eq: mockEq,
        gte: mockGte,
        not: mockNot,
        then: (resolve: (value: { data: unknown[] }) => unknown) =>
          resolve(data),
      };
      mockSelect.mockReturnValue(chain);
      mockEq.mockReturnValue(chain);
      mockGte.mockReturnValue(chain);
      mockNot.mockReturnValue(chain);
      return chain;
    };

    (supabase.from as Mock).mockImplementation((table: string) => {
      if (table === 'pomodoro_sessions') {
        // Custom chain for pomodoro sessions if needed, otherwise default
        return createChain({ data: [] });
      }
      if (table === 'note_chunks') {
        return createChain({ data: [] });
      }
      if (table === 'chunk_mastery') {
        return createChain({ data: [] });
      }
      return createChain();
    });

    // Default mock for calculateFocusPower
    (calculateFocusPower as Mock).mockReturnValue(50);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Weekend Filtering Logic', () => {
    it('should filter out totally empty weekend days from loadWeek', async () => {
      // Set time to Tuesday so we can look back at the weekend
      // Jan 2, 2024 is Tuesday. Jan 1 is Monday.
      // Weekend was Dec 30 (Sat) and Dec 31 (Sun).
      // Let's set time to Wednesday Jan 3rd to encompass the weekend fully in `loadWeek`
      vi.setSystemTime(new Date(2024, 0, 3, 12, 0, 0)); // Wed Jan 03 2024

      // Mock ONLY Monday activity. Sat/Sun empty.
      const mockSessions = [
        { started_at: '2024-01-01T10:00:00Z', total_work_time: 3600 }, // Monday
      ];

      // Robust mock for this specific test
      const mockChain = {
        select: vi.fn(),
        eq: vi.fn(),
        gte: vi.fn(),
        not: vi.fn(),
        then: (resolve: (value: { data: typeof mockSessions }) => unknown) =>
          resolve({ data: mockSessions }),
      };
      mockChain.select.mockReturnValue(mockChain);
      mockChain.eq.mockReturnValue(mockChain);
      mockChain.gte.mockReturnValue(mockChain);
      mockChain.not.mockReturnValue(mockChain);

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'pomodoro_sessions') return mockChain;

        // Return a safe dummy chain for other tables (note_chunks etc)
        const dummyChain = {
          select: vi.fn(),
          eq: vi.fn(),
          gte: vi.fn(),
          not: vi.fn(),
          then: (resolve: (value: { data: unknown[] }) => unknown) =>
            resolve({ data: [] }),
        };
        dummyChain.select.mockReturnValue(dummyChain);
        dummyChain.eq.mockReturnValue(dummyChain);
        dummyChain.gte.mockReturnValue(dummyChain);
        dummyChain.not.mockReturnValue(dummyChain);
        return dummyChain;
      });

      const { result } = renderHook(() => useEfficiencyData());

      await waitFor(() => expect(result.current.loading).toBe(false));

      // loadWeek returns up to 7 days.
      // Dates:
      // Wed Jan 3 (Today) - 0 mins
      // Tue Jan 2 - 0 mins
      // Mon Jan 1 - 60 mins
      // Sun Dec 31 - 0 mins (Weekend) -> Should be filtered OUT?
      // Sat Dec 30 - 0 mins (Weekend) -> Should be filtered OUT?
      // Fri Dec 29 - 0 mins
      // Thu Dec 28 - 0 mins
      // Wed Dec 27 - 0 mins

      // Let's debug what we expect. Logic says:
      // if totalMins === 0 && (dayOfWeek === Sunday || Saturday) -> filter out.

      const rawDates = result.current.loadWeek.map((d) => d.day);

      // Expected:
      // Wed 3 Jan (Bugün) - 0 mins (Not weekend, kept)
      // Tue 2 Jan (2 Oca) - 0 mins (Not weekend, kept)
      // Mon 1 Jan (1 Oca) - 60 mins (Not weekend, kept)
      // Sun 31 Dec (31 Ara) - 0 mins (Weekend, EMPTY -> FILTERS OUT)
      // Sat 30 Dec (30 Ara) - 0 mins (Weekend, EMPTY -> FILTERS OUT)
      // Fri 29 Dec (29 Ara) - 0 mins (Kept)
      // Thu 28 Dec (28 Ara) - 0 mins (Kept)

      // Note: `loadWeek` logic (lines 209-210) fetches 12 days then slices last 7.
      // Filter runs BEFORE slice? No, `assembleData` filters then returns.
      // So slicing might happen on filtered data or pre-filtered?
      // `assembleData(12)` runs filter. Then `weekRaw.slice(-7)`.

      // Check if 31 Ara and 30 Ara are present.
      expect(rawDates).not.toContain('31 Ara');
      expect(rawDates).not.toContain('30 Ara');
      expect(rawDates).toContain('Bugün');
      expect(rawDates).toContain('1 Oca');
    });

    it('should handle partial weekend activity in consistencyData (Sat 0, Sun > 0)', async () => {
      // Setup: Sat empty, Sun has activity.
      // Date: Mon Jan 1 2024.
      // Sun Dec 31: Activity.
      // Sat Dec 30: No Activity.

      vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0)); // Mon Jan 1

      const mockSessions = [
        { started_at: '2023-12-31T10:00:00Z', total_work_time: 3600 }, // Sun
      ];

      // Robust mock for this specific test
      const mockChain = {
        select: vi.fn(),
        eq: vi.fn(),
        gte: vi.fn(),
        not: vi.fn(),
        then: (resolve: (value: { data: typeof mockSessions }) => unknown) =>
          resolve({ data: mockSessions }),
      };
      mockChain.select.mockReturnValue(mockChain);
      mockChain.eq.mockReturnValue(mockChain);
      mockChain.gte.mockReturnValue(mockChain);
      mockChain.not.mockReturnValue(mockChain);

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'pomodoro_sessions') return mockChain;

        const dummyChain = {
          select: vi.fn(),
          eq: vi.fn(),
          gte: vi.fn(),
          not: vi.fn(),
          then: (resolve: (value: { data: unknown[] }) => unknown) =>
            resolve({ data: [] }),
        };
        dummyChain.select.mockReturnValue(dummyChain);
        dummyChain.eq.mockReturnValue(dummyChain);
        dummyChain.gte.mockReturnValue(dummyChain);
        dummyChain.not.mockReturnValue(dummyChain);
        return dummyChain;
      });

      const { result } = renderHook(() => useEfficiencyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // consistencyData has specific logic:
      // If Sat is 0, check next day (Sun). If Sun > 0, KEEP Sat?
      // Logic at lines 383-387:
      // if (mins === 0) { if (dayOfWeek === 6) { if (nextDay > 0) return false; } }
      // Wait, return false means FILTER OUT (HIDE).
      // So if Sat 0 and Sun > 0, Sat is HIDDEN.
      // The user asked: "Eğer Cumartesi 0 ama Pazar doluysa, Cumartesi'nin gizlenip gizlenmediğini test et."
      // Based on code: `return false` -> Hidden.

      const consistency = result.current.consistencyData;
      // Find dates for Sat Dec 30 2023 and Sun Dec 31 2023.
      // consistencyData keys are `YYYY-MM-DD`.
      // Sat: "2023-12-30", Sun: "2023-12-31".

      const satData = consistency.find((c) => c.date === '2023-12-30');
      const sunData = consistency.find((c) => c.date === '2023-12-31');

      // Sun should be present
      expect(sunData).toBeDefined();

      // Sat should be HIDDEN (undefined) because it is 0 and Sun is active?
      // Let's re-read logic:
      // if (dayOfWeek === 6) { const nextDay = arr[idx+1]; if (nextDay.totalMinutes > 0) return false; }
      // Yes, it returns false, so Sat is removed.
      expect(satData).toBeUndefined();
    });
  });

  describe('Cognitive Analysis Score', () => {
    it('should calculate focusScore correctly and sort topConfused', async () => {
      // Prepare Mock Data
      const mockInsights = [
        {
          responseType: 'correct',
          insight: 'A',
          diagnosis: 'Concept A',
          consecutiveFails: 0,
        },
        {
          responseType: 'wrong',
          consecutiveFails: 1,
          diagnosis: 'Concept B',
        },
        {
          responseType: 'wrong',
          consecutiveFails: 2,
          diagnosis: 'Concept B',
        }, // Same concept
        {
          responseType: 'correct',
          insight: 'B',
          diagnosis: 'Concept C',
          consecutiveFails: 0,
        },
      ];
      // Total Attempts: 4
      // Correct: 2
      // Consecutive Fails Sum: 1 + 2 = 3

      // Formula: (Correct / Attempts * 100) - (ConsecutiveFails * 5)
      // (2 / 4 * 100) - (3 * 5) = 50 - 15 = 35.

      // Confused Concepts: Concept B (2), Concept A (1), Concept C (1).

      (clientDb.getRecentCognitiveInsights as Mock).mockResolvedValue(
        mockInsights
      );

      const { result } = renderHook(() => useEfficiencyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const analysis = result.current.cognitiveAnalysis;

      expect(analysis).not.toBeNull();
      if (analysis) {
        expect(analysis.focusScore).toBe(35);

        // Verify topConfused sorting
        expect(analysis.topConfused[0].text).toBe('Concept B');
        expect(analysis.topConfused[0].count).toBe(2);
      }
    });

    it('should ensure focusScore never drops below 0', async () => {
      const mockInsights = [
        {
          responseType: 'wrong',
          consecutiveFails: 10,
          diagnosis: 'Bad Concept',
        },
        // Score: (0/1 * 100) - (10 * 5) = 0 - 50 = -50.
        // Should be max(0, -50) = 0.
      ];
      (clientDb.getRecentCognitiveInsights as Mock).mockResolvedValue(
        mockInsights
      );

      const { result } = renderHook(() => useEfficiencyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.cognitiveAnalysis?.focusScore).toBe(0);
    });
  });

  describe('Focus Power Aggregation', () => {
    it('should aggregate session times correctly for calculateFocusPower', async () => {
      // Mock multiple sessions on the same day
      vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0)); // Mon Jan 1

      const mockSessions = [
        {
          started_at: '2024-01-01T09:00:00Z',
          total_work_time: 3000,
          total_break_time: 300,
          total_pause_time: 60,
        },
        {
          started_at: '2024-01-01T14:00:00Z',
          total_work_time: 1500,
          total_break_time: 150,
          total_pause_time: 30,
        },
      ];
      // Total Work: 4500
      // Total Break: 450
      // Total Pause: 90

      // Robust mock for this specific test
      const mockChain = {
        select: vi.fn(),
        eq: vi.fn(),
        gte: vi.fn(),
        not: vi.fn(),
        then: (resolve: (value: { data: typeof mockSessions }) => unknown) =>
          resolve({ data: mockSessions }),
      };
      mockChain.select.mockReturnValue(mockChain);
      mockChain.eq.mockReturnValue(mockChain);
      mockChain.gte.mockReturnValue(mockChain);
      mockChain.not.mockReturnValue(mockChain);

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'pomodoro_sessions') return mockChain;

        const dummyChain = {
          select: vi.fn(),
          eq: vi.fn(),
          gte: vi.fn(),
          not: vi.fn(),
          then: (resolve: (value: { data: unknown[] }) => unknown) =>
            resolve({ data: [] }),
        };
        dummyChain.select.mockReturnValue(dummyChain);
        dummyChain.eq.mockReturnValue(dummyChain);
        dummyChain.gte.mockReturnValue(dummyChain);
        dummyChain.not.mockReturnValue(dummyChain);
        return dummyChain;
      });

      const { result } = renderHook(() => useEfficiencyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Check call to calculateFocusPower
      expect(calculateFocusPower).toHaveBeenCalledWith(4500, 450, 90);

      // aggregate check in focusPowerWeek
      const todayData = result.current.focusPowerWeek.find(
        (d) => d.date === '1 Oca'
      ); // using tr-TR locale assumption from code
      expect(todayData).toBeDefined();
      if (todayData) {
        expect(todayData.workMinutes).toBe(Math.round(4500 / 60)); // 75
        expect(todayData.breakMinutes).toBe(Math.round(450 / 60)); // 7.5 -> 8? Math.round(7.5) = 8
        expect(todayData.pauseMinutes).toBe(Math.round(90 / 60)); // 1.5 -> 2?
      }
    });
  });

  describe('Learning Load Ranges', () => {
    it('should return correct number of days and correct labels', async () => {
      vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0)); // Mon

      const { result } = renderHook(() => useEfficiencyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // loadWeek should be max 7 items
      expect(result.current.loadWeek.length).toBeLessThanOrEqual(7);

      // loadDay should be 1 item ("Bugün")
      expect(result.current.loadDay.length).toBe(1);
      expect(result.current.loadDay[0].day).toBe('Bugün');

      // loadMonth should be max 30 items
      expect(result.current.loadMonth.length).toBeLessThanOrEqual(30);
    });
  });
});
