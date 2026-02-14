import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { useEfficiencyData } from '@/features/efficiency/hooks/use-efficiency-data';
import { useAuth } from '@/features/auth/hooks/use-auth';
import * as clientDb from '@/shared/lib/core/client-db';
import { supabase } from '@/shared/lib/core/supabase';
import { calculateFocusPower } from '@/shared/lib/core/utils/efficiency-math';
import { logger } from '@/shared/lib/core/utils/logger';

// Mock dependencies
vi.mock('@/features/auth/hooks/use-auth');
vi.mock('@/shared/lib/core/client-db');
vi.mock('@/shared/lib/core/utils/logger');
// Note: We use the global mock for supabase defined in setup.tsx

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

  // Helper to create a chainable mock that resolves to specific data
  const createMockChain = <T>(
    data: T[] = []
  ): {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    not: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    then: ReturnType<typeof vi.fn>;
  } => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (value: { data: T[]; error: null }) => void) =>
        resolve({ data, error: null })
      ),
    };
    return chain;
  };

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

    // Default supabase mock implementation
    (supabase.from as Mock).mockImplementation((_table: string) => {
      // Return empty list by default for all tables
      return createMockChain([]);
    });

    // Default mock for calculateFocusPower
    (calculateFocusPower as Mock).mockReturnValue(50);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Weekend Filtering Logic', () => {
    it('should filter out totally empty weekend days from loadWeek', async () => {
      // Set time to Wednesday Jan 3rd 2024
      vi.setSystemTime(new Date(2024, 0, 3, 12, 0, 0));

      const mockSessions = [
        { started_at: '2024-01-01T10:00:00Z', total_work_time: 3600 }, // Monday
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'pomodoro_sessions') return createMockChain(mockSessions);
        return createMockChain([]);
      });

      const { result } = renderHook(() => useEfficiencyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const rawDates = result.current.loadWeek.map((d) => d.day);

      // Sun 31 Dec and Sat 30 Dec should be filtered OUT (empty weekends)
      expect(rawDates).not.toContain('31 Ara');
      expect(rawDates).not.toContain('30 Ara');
      expect(rawDates).toContain('Bugün'); // Wed
      expect(rawDates).toContain('1 Oca'); // Mon
    });

    it('should keep weekend days if they have activity', async () => {
      // Set time to Tuesday Jan 2nd 2024
      vi.setSystemTime(new Date(2024, 0, 2, 12, 0, 0));

      // Make Sunday 31 Dec active
      const mockSessions = [
        { started_at: '2023-12-31T10:00:00Z', total_work_time: 3600 }, // Sunday
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'pomodoro_sessions') return createMockChain(mockSessions);
        return createMockChain([]);
      });

      const { result } = renderHook(() => useEfficiencyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const rawDates = result.current.loadWeek.map((d) => d.day);

      // Sun 31 Dec should be PRESENT
      expect(rawDates).toContain('31 Ara');
    });

    it('should handle partial weekend activity in consistencyData (Sat 0, Sun > 0)', async () => {
      vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0)); // Mon Jan 1

      // Sun Dec 31: Activity. Sat Dec 30: No Activity.
      const mockSessions = [
        { started_at: '2023-12-31T10:00:00Z', total_work_time: 3600 },
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'pomodoro_sessions') return createMockChain(mockSessions);
        return createMockChain([]);
      });

      const { result } = renderHook(() => useEfficiencyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const consistency = result.current.consistencyData;
      const satData = consistency.find((c) => c.date === '2023-12-30');
      const sunData = consistency.find((c) => c.date === '2023-12-31');

      // Sun active -> present
      expect(sunData).toBeDefined();
      // Sat empty but Sun active -> Sat hidden
      expect(satData).toBeUndefined();
    });
  });

  describe('Mastery Chain Logic', () => {
    it('should handle empty or undefined concept_map without crashing', async () => {
      const mockChunks = [
        { id: '1', metadata: { concept_map: null }, course_id: 'c1' }, // Null
        { id: '2', metadata: {}, course_id: 'c1' }, // Undefined
        { id: '3', metadata: { concept_map: [] }, course_id: 'c1' }, // Empty array
      ];

      const mockMastery = [{ chunk_id: '1', mastery_score: 80 }];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'note_chunks') return createMockChain(mockChunks);
        if (table === 'chunk_mastery') return createMockChain(mockMastery);
        return createMockChain([]);
      });

      const { result } = renderHook(() => useEfficiencyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Should ensure it simply finishes and doesn't throw
      expect(result.current.masteryChainStats).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should log error when service throws', async () => {
      (clientDb.getDailyStats as Mock).mockRejectedValue(
        new Error('Service Failed')
      );

      const { result } = renderHook(() => useEfficiencyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch efficiency data',
        expect.any(Error)
      );
    });
  });

  describe('Cognitive Analysis Score', () => {
    it('should calculate focusScore correctly and sort topConfused', async () => {
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
        },
        {
          responseType: 'correct',
          insight: 'B',
          diagnosis: 'Concept C',
          consecutiveFails: 0,
        },
      ];

      (clientDb.getRecentCognitiveInsights as Mock).mockResolvedValue(
        mockInsights
      );

      const { result } = renderHook(() => useEfficiencyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const analysis = result.current.cognitiveAnalysis;

      expect(analysis).not.toBeNull();
      if (analysis) {
        expect(analysis.focusScore).toBe(35);
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

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'pomodoro_sessions') return createMockChain(mockSessions);
        return createMockChain([]);
      });

      const { result } = renderHook(() => useEfficiencyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(calculateFocusPower).toHaveBeenCalledWith(4500, 450, 90);

      const todayData = result.current.focusPowerWeek.find(
        (d) => d.date === '1 Oca'
      );
      expect(todayData).toBeDefined();
      if (todayData) {
        expect(todayData.workMinutes).toBe(Math.round(4500 / 60));
        expect(todayData.breakMinutes).toBe(Math.round(450 / 60));
        expect(todayData.pauseMinutes).toBe(Math.round(90 / 60));
      }
    });
  });

  describe('Learning Load Ranges', () => {
    it('should return correct number of days and correct labels', async () => {
      vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0)); // Mon

      const { result } = renderHook(() => useEfficiencyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.loadWeek.length).toBeLessThanOrEqual(7);
      expect(result.current.loadDay.length).toBe(1);
      expect(result.current.loadDay[0].day).toBe('Bugün');
      expect(result.current.loadMonth.length).toBeLessThanOrEqual(30);
    });
  });
});
