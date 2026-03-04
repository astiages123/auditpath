import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { getFocusPowerData } from '@/features/statistics/services/statisticsDataService';
import { safeQuery } from '@/lib/supabaseHelpers';
// getVirtualDateKey removed as it was unused

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

describe('Zero-Value Timezone Leak in getFocusPowerData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly map a session that occurred after 00:00 (Timezone Shift)', async () => {
    // Current local time: 2024-05-15 14:00:00 (+03:00)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-15T11:00:00Z')); // 14:00:00 TRT

    // Simulate session fetched from DB.
    // Example: User worked at 01:30 AM local time on May 15th.
    // That means it's 2024-05-14T22:30:00Z in UTC.
    const mockSessions = [
      {
        started_at: '2024-05-14T22:30:00Z', // Local: May 15, 01:30 AM
        total_work_time: 3600, // 60 mins -> 1 hour
      },
    ];

    (safeQuery as Mock).mockResolvedValue({ data: mockSessions });

    // Based on STANDARD day logic, > 00:00 AM stays on the same day.
    // So May 15, 01:30 AM should belong to May 15.
    await getFocusPowerData({
      userId: 'u-1',
      range: 'week',
    });

    vi.setSystemTime(new Date('2024-05-21T11:00:00Z')); // May 21 14:00 TRT (Tuesday)
    mockSessions[0].started_at = '2024-05-20T22:30:00Z'; // Local: May 21 01:30 (Tuesday) -> mapped to May 21 (Tuesday)

    // Note: If Graduate student rules drop Tuesday, it will be missing!
    // But assuming the system counts it according to standard time mapping..
    const result2 = await getFocusPowerData({
      userId: 'u-1',
      range: 'week',
    });

    // Check if the data points to Tuesday
    const mappedPoint = result2.find((p) =>
      p.originalDate.includes('2024-05-21')
    );

    expect(mappedPoint).toBeDefined();
    // It will be found on Tuesday
    expect(mappedPoint?.workMinutes).toBe(60);

    vi.useRealTimers();
  });

  it('should expose string formatting bug when DB timestamp lacks Z character', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-21T14:00:00+03:00'));

    // What if Supabase returned timestamp WITHOUT timezone character Z?
    // "2024-05-21T01:30:00" -> Local parses it as May 21, 01:30 TRT.
    // Standard day shift will assign it to May 21.
    const mockSessions = [
      {
        started_at: '2024-05-21T01:30:00',
        total_work_time: 3600,
      },
    ];
    (safeQuery as Mock).mockResolvedValue({ data: mockSessions });

    const result = await getFocusPowerData({
      userId: 'u-1',
      range: 'week',
    });

    const mappedPoint = result.find((p) =>
      p.originalDate.includes('2024-05-21')
    );
    expect(mappedPoint).toBeDefined();
    expect(mappedPoint?.workMinutes).toBe(60);

    vi.useRealTimers();
  });

  it('should leak data (Zero-Value) if session falls on the edge of the range and shifts to previous Virtual Day', async () => {
    // Current local time: 2024-05-21 14:00:00 (Tuesday)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-21T11:00:00Z')); // 14:00:00 TRT

    // Range is 'week' (7 days).
    vi.setSystemTime(new Date('2024-05-22T11:00:00Z')); // May 22 14:00 (Wednesday)

    // Loop creates: May 16, 17, 18, 19, 20, 21, 22.
    // User works May 16 01:30 AM (Thursday early morning).
    const mockSessions = [
      {
        started_at: '2024-05-15T22:30:00Z', // Local: May 16, 01:30 AM
        total_work_time: 3600, // 60 mins -> 1 hour
      },
    ];

    (safeQuery as Mock).mockResolvedValue({ data: mockSessions });

    const result = await getFocusPowerData({
      userId: 'u-1',
      range: 'week',
    });

    // The result array will contain the 60 minutes for May 16,
    // because standard date logic will keep the 01:30 AM session on May 16.
    const mappedPoint = result.find((p) =>
      p.originalDate.includes('2024-05-16')
    );

    const hasMay15 = result.some((p) => p.originalDate.includes('2024-05-15'));

    expect(mappedPoint).toBeDefined();
    expect(mappedPoint?.workMinutes).toBe(60);
    expect(hasMay15).toBe(false); // 15 May is nowhere to be found (outside window)

    vi.useRealTimers();
  });
});
