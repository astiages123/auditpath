import { z } from 'zod';
import { isValid, parseOrThrow } from '@/utils/validation';

const ExchangeRateApiResponseSchema = z.object({
  rates: z.record(z.string(), z.number()),
});

const ExchangeRateSchema = z.object({
  currency_pair: z.string(),
  rate: z.number(),
  updated_at: z.string(),
});

type ExchangeRate = z.infer<typeof ExchangeRateSchema>;

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';
const PAIR_USD_TRY = 'USD-TRY';
const STORAGE_KEY = 'auditpath_exchange_rate_usd_try';

export const ExchangeRateService = {
  /**
   * Fetches the current USD to TRY exchange rate.
   * Uses a caching strategy with localStorage:
   * 1. Checks localStorage for a cached rate (valid for 24 hours).
   * 2. If stale or missing, fetches from the external API.
   * 3. Caches the new rate in localStorage.
   *
   * @returns {Promise<number | null>} The USD to TRY exchange rate, if available.
   */
  async getUsdToTryRate(): Promise<number | null> {
    const cachedString = localStorage.getItem(STORAGE_KEY);

    if (cachedString) {
      try {
        const data = JSON.parse(cachedString);

        if (isValid(ExchangeRateSchema, data)) {
          const cachedData = parseOrThrow(ExchangeRateSchema, data);
          const lastUpdated = new Date(cachedData.updated_at).getTime();
          const now = Date.now();
          const oneDayMs = 24 * 60 * 60 * 1000;
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

          if (now - lastUpdated < oneDayMs) {
            return Number(cachedData.rate);
          }

          if (now - lastUpdated < sevenDaysMs) {
            // Background refresh attempt, but return cached if it fails
            const freshRate = await this.refreshRateFromApi().catch(() => null);
            return freshRate ?? Number(cachedData.rate);
          }
        }
      } catch (e) {
        console.error('Error parsing cached exchange rate:', e);
        // Fall through to refresh
      }
    }

    return await this.refreshRateFromApi();
  },

  /**
   * Internal helper to refresh rate from API and cache it in localStorage.
   */
  async refreshRateFromApi(): Promise<number | null> {
    try {
      const response = await fetch(EXCHANGE_RATE_API);
      if (!response.ok) {
        throw new Error(`API returned status: ${response.status}`);
      }

      const rawApiData = await response.json();
      const apiData = ExchangeRateApiResponseSchema.parse(rawApiData);
      const newRate = apiData.rates['TRY'];

      if (!newRate) return null;

      const rateData: ExchangeRate = {
        currency_pair: PAIR_USD_TRY,
        rate: newRate,
        updated_at: new Date().toISOString(),
      };

      // Cache to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rateData));

      return newRate;
    } catch (error) {
      console.error('Failed to refresh exchange rate:', error);
      return null;
    }
  },
};
