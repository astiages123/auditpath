import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExchangeRateService } from '@/features/costs/services/exchangeRateService';

const STORAGE_KEY = 'auditpath_exchange_rate_usd_try';
const storage = new Map<string, string>();

global.fetch = vi.fn();
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    storage.delete(key);
  }),
  clear: vi.fn(() => {
    storage.clear();
  }),
});

describe('ExchangeRateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
    localStorage.clear();
  });

  it('should return cached rate if under 24 hours', async () => {
    const freshDate = new Date().toISOString();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currency_pair: 'USD-TRY',
        rate: 33.5,
        updated_at: freshDate,
      })
    );

    const rate = await ExchangeRateService.getUsdToTryRate();
    expect(rate).toBe(33.5);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should refresh from API if cached rate is stale (>24h)', async () => {
    const staleDate = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currency_pair: 'USD-TRY',
        rate: 33.5,
        updated_at: staleDate,
      })
    );

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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currency_pair: 'USD-TRY',
        rate: 33.5,
        updated_at: staleDate,
      })
    );

    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    const rate = await ExchangeRateService.getUsdToTryRate();
    expect(rate).toBe(33.5);
  });

  it('should return null if cache is missing and API fails', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('API Down'));

    const rate = await ExchangeRateService.getUsdToTryRate();
    expect(rate).toBeNull();
  });
});
