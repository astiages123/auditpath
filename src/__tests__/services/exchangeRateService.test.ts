import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExchangeRateService } from '@/features/analytics/services/exchangeRateService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      upsert: vi.fn(),
    })),
  },
}));

global.fetch = vi.fn();

describe('ExchangeRateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cached rate if under 24 hours', async () => {
    const freshDate = new Date().toISOString();
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          currency_pair: 'USD-TRY',
          rate: 33.5,
          updated_at: freshDate,
        },
        error: null,
      }),
      upsert: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    const rate = await ExchangeRateService.getUsdToTryRate();
    expect(rate).toBe(33.5);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should refresh from API if cached rate is stale (>24h)', async () => {
    const staleDate = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          currency_pair: 'USD-TRY',
          rate: 33.5,
          updated_at: staleDate,
        },
        error: null,
      }),
      upsert: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rates: { TRY: 34.2 } }),
    } as Response);

    const rate = await ExchangeRateService.getUsdToTryRate();
    expect(rate).toBe(34.2);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should use stale cached rate if API fails but stale rate is <7 days old', async () => {
    const staleDate = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000
    ).toISOString();
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          currency_pair: 'USD-TRY',
          rate: 33.5,
          updated_at: staleDate,
        },
        error: null,
      }),
      upsert: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    const rate = await ExchangeRateService.getUsdToTryRate();
    expect(rate).toBe(33.5);
  });

  it('should use hardcoded fallback 35.0 if all sources fail', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      upsert: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);
    vi.mocked(global.fetch).mockRejectedValue(new Error('API Down'));

    const rate = await ExchangeRateService.getUsdToTryRate();
    expect(rate).toBe(35.0);
  });
});
