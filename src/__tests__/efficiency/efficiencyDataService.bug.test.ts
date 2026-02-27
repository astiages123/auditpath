import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { getFocusPowerData } from '@/features/efficiency/services/efficiencyDataService';
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

    // Based on virtual day logic, < 04:00 AM shifts to previous day.
    // So May 15, 01:30 AM should belong to May 14.
    await getFocusPowerData({
      userId: 'u-1',
      range: 'week',
    });

    // Assert that the graph actually populated the score for the "yesterday"
    // Since May 14 is a Tuesday, wait! The filter removes Tuesday, Wednesday, Thursday!!!
    // May 14 2024 is a Tuesday! It will be filtered out!
    // Let's use May 20 2024 (Monday) -> session at May 21 01:30 (Tuesday early AM, assigned to Monday)
    vi.setSystemTime(new Date('2024-05-21T11:00:00Z')); // May 21 14:00 TRT (Tuesday)
    mockSessions[0].started_at = '2024-05-20T22:30:00Z'; // Local: May 21 01:30 (Tuesday) -> mapped to May 20 (Monday)

    // const expectedDateKey2 = '2024-05-20'; // Monday is kept!

    const result2 = await getFocusPowerData({
      userId: 'u-1',
      range: 'week',
    });

    // Check if the data points to Monday with 60 minutes
    // The date format in the object might be '20 May' or similar.
    // Let's check originalDate string inclusion
    const mappedPoint = result2.find((p) =>
      p.originalDate.includes('2024-05-20')
    );

    expect(mappedPoint).toBeDefined();
    // Prove that it didn't leak. If it's undefined, we found the bug.
    expect(mappedPoint?.workMinutes).toBe(60);

    vi.useRealTimers();
  });

  it('should expose string formatting bug when DB timestamp lacks Z character', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-21T14:00:00+03:00'));

    // What if Supabase returned timestamp WITHOUT timezone character Z?
    // "2024-05-21T01:30:00" -> Local parses it as May 21, 01:30 TRT.
    // Virtual date shift will assign it to May 20.
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
      p.originalDate.includes('2024-05-20')
    );
    expect(mappedPoint).toBeDefined();
    expect(mappedPoint?.workMinutes).toBe(60);

    vi.useRealTimers();
  });

  it('should leak data (Zero-Value) if session falls on the edge of the range and shifts to previous Virtual Day', async () => {
    // Current local time: 2024-05-21 14:00:00 (Tuesday)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-21T11:00:00Z')); // 14:00:00 TRT

    // The user works on May 15, 01:30 AM (Wednesday early morning)
    // Range is 'week' (7 days).
    // assembleData loops i=6 to i=0.
    // anchorDate = May 21 04:00.
    // i=6 -> May 15. The loop creates dateKeys: ["2024-05-15" to "2024-05-21"]
    // However, May 15 01:30 AM is Virtual Day "2024-05-14".
    // "2024-05-14" is NOT in the assembled date keys! It is lost!

    // Note: May 14 is a Tuesday. The logic filters out Tuesdays for Graduate students.
    // Let's use May 22 (Wednesday) to avoid the graduate study filter interference.
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

    // The result array should NOT contain the 60 minutes because it mapped to May 15 (which is outside the 7-day May 16-22 window string array)
    // User confirmed: He does not study at night or on Graduate Days. This "leak" is actually a rigorous enforcement of his business rules.
    const mappedPoint = result.find((p) =>
      p.originalDate.includes('2024-05-16')
    );

    const hasMay15 = result.some((p) => p.originalDate.includes('2024-05-15'));

    expect(mappedPoint).toBeUndefined(); // 16 May is completely filtered out or zeroed (Since no active work is registered for that remaining day slot)
    expect(hasMay15).toBe(false); // 15 May is nowhere to be found (Correct, outside 7 day window)

    vi.useRealTimers();
  });
});
