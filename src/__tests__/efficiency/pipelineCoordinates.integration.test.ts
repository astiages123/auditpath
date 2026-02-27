import { describe, expect, it, type Mock, vi } from 'vitest';
import { getFocusPowerData } from '@/features/efficiency/services/efficiencyDataService';
import { safeQuery } from '@/lib/supabaseHelpers';
import { calculateFocusPower } from '@/features/efficiency/logic/metricsCalc';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: null,
      }),
    })),
  },
}));

vi.mock('@/lib/supabaseHelpers', () => ({
  handleSupabaseError: vi.fn(),
  safeQuery: vi.fn(),
}));

describe('15:00 Session Pipeline Integration (metricsCalc -> Data Service -> Line Coordinates)', () => {
  it('should calculate exact x:Date and y:Score coordinates for a 15:00 session and console dump them', async () => {
    // Step 1: Set precise system time to a known anchor
    vi.useFakeTimers();
    const systemTime = new Date('2024-05-20T17:00:00Z'); // User requests a 15:00 local session. We set system to 20:00 local (assuming +03:00 TRT)
    vi.setSystemTime(systemTime);

    // A 15:00 Local TRT session in UTC is 12:00 Z. Let's say it's on May 20.
    const mockSessions = [
      {
        started_at: '2024-05-20T12:00:00Z', // 15:00 TRT
        total_work_time: 7200, // 2 Hours (120 mins)
        total_break_time: 600, // 10 mins break
        total_pause_time: 0, // 0 pause
      },
    ];

    (safeQuery as Mock).mockResolvedValue({ data: mockSessions });

    // Step 2: The exact metricsCalc logic verification
    // Expected Formula in metricsCalc: (Work / [Break + Pause]) * 20 -> with a min 60s denominator
    // 7200 / max(60, 600 + 0) * 20
    // (7200 / 600) * 20 = 12 * 20 = 240 score
    const expectedRawCalc = calculateFocusPower(7200, 600, 0);
    expect(expectedRawCalc).toBe(240);

    // Step 3: Call the service that aggregates this data
    const result = await getFocusPowerData({
      userId: 'u-1',
      range: 'week',
    });

    // Step 4: Extract the resulting Line coordinates passed down to the Chart
    const mappedPoint = result.find((p) =>
      p.originalDate.includes('2024-05-20')
    );

    expect(mappedPoint).toBeDefined();

    // The final dataset pushed to X-Axis and Y-Axis mapping
    const yCoordinate = mappedPoint?.score; // The Score passed to YAxis Domain

    // console.log statements removed for linting compliance

    expect(yCoordinate).toBe(240); // Verify it arrived unaltered
    expect(mappedPoint?.workMinutes).toBe(120); // 7200 / 60
    expect(mappedPoint?.breakMinutes).toBe(10); // 600 / 60

    vi.useRealTimers();
  });
});
