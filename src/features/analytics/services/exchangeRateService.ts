// ==========================================
// IMPORTS
// ==========================================

import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { isValid, parseOrThrow } from '@/utils/validation';

// ==========================================
// SCHEMAS
// ==========================================

const ExchangeRateApiResponseSchema = z.object({
  rates: z.record(z.string(), z.number()),
});

const ExchangeRateSchema = z.object({
  currency_pair: z.string(),
  rate: z.number(),
  updated_at: z.string(),
});

// ==========================================
// CONSTANTS
// ==========================================

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';
const PAIR_USD_TRY = 'USD-TRY';

// ==========================================
// SERVICE
// ==========================================

export const ExchangeRateService = {
  /**
   * Fetches the current USD to TRY exchange rate.
   * Uses a caching strategy:
   * 1. Checks Supabase for a cached rate (valid for 24 hours).
   * 2. If stale or missing, fetches from the external API.
   * 3. Caches the new rate in Supabase.
   *
   * @returns {Promise<number>} The USD to TRY exchange rate.
   */
  async getUsdToTryRate(): Promise<number> {
    try {
      // 1. Check Supabase for cached rate
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('currency_pair', PAIR_USD_TRY)
        .maybeSingle();

      const cachedData = isValid(ExchangeRateSchema, data)
        ? (parseOrThrow(ExchangeRateSchema, data) as {
            rate: number;
            updated_at: string;
          })
        : null;

      if (cachedData && !error) {
        const lastUpdated = new Date(cachedData.updated_at).getTime();
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        // If fresh (under 24h), return immediately
        if (now - lastUpdated < oneDayMs) {
          return Number(cachedData.rate);
        }

        // If stale but under 7 days, try to refresh but keep as fallback
        try {
          const freshRate = await this.refreshRateFromApi();
          if (freshRate) return freshRate;
        } catch {
          console.warn(
            '[ExchangeRateService] Refresh failed, using stale cached rate:',
            cachedData.rate,
            'Age (days):',
            Math.floor((now - lastUpdated) / (24 * 3600 * 1000))
          );
          // Still return stale rate if it's not too old (e.g., under 7 days)
          if (now - lastUpdated < sevenDaysMs) {
            return Number(cachedData.rate);
          }
        }
      }

      // 2. Fetch from API if missing or extremely stale
      const newRate = await this.refreshRateFromApi();
      if (newRate) return newRate;

      throw new Error('All exchange rate sources failed');
    } catch (error) {
      console.error(
        '[ExchangeRateService][getUsdToTryRate] Final Fallback:',
        error
      );
      // Hardcoded fallback as absolute last resort
      return 35.0;
    }
  },

  /**
   * Internal helper to refresh rate from API and cache it.
   */
  async refreshRateFromApi(): Promise<number | null> {
    const response = await fetch(EXCHANGE_RATE_API);
    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }

    const rawApiData = await response.json();
    const apiData = ExchangeRateApiResponseSchema.parse(rawApiData);
    const newRate = apiData.rates['TRY'];

    if (!newRate) return null;

    // Cache to Supabase
    await supabase.from('exchange_rates').upsert(
      {
        currency_pair: PAIR_USD_TRY,
        rate: newRate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'currency_pair' }
    );

    return newRate;
  },
};
