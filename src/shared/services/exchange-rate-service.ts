import { supabase } from '@/shared/lib/core/supabase';

import { z } from 'zod';
import { isValid, parseOrThrow } from '@/shared/lib/validation/type-guards';

const ExchangeRateApiResponseSchema = z.object({
  rates: z.record(z.string(), z.number()),
});

const ExchangeRateSchema = z.object({
  currency_pair: z.string(),
  rate: z.number(),
  updated_at: z.string(),
});

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';
const PAIR_USD_TRY = 'USD-TRY';

export const ExchangeRateService = {
  async getUsdToTryRate(): Promise<number> {
    try {
      // 1. CheckSupabase for cached rate
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('currency_pair', PAIR_USD_TRY)
        .maybeSingle(); // Prevents 406 if no row exists

      const fastRate = isValid(ExchangeRateSchema, data)
        ? (parseOrThrow(ExchangeRateSchema, data) as {
            rate: number;
            updated_at: string;
          })
        : null;

      if (fastRate && !error) {
        const lastUpdated = new Date(fastRate.updated_at).getTime();

        const now = new Date().getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (now - lastUpdated < oneDayMs) {
          return Number(fastRate.rate);
        }
      }

      // 2. Fetch from API if missing or stale
      const response = await fetch(EXCHANGE_RATE_API);
      const rawApiData = await response.json();
      const apiData = ExchangeRateApiResponseSchema.parse(rawApiData);
      const newRate = apiData.rates['TRY'];

      if (!newRate) throw new Error('Failed to fetch TRY rate');

      // 3. Update Supabase
      const { error: upsertError } = await supabase
        .from('exchange_rates')
        .upsert(
          {
            currency_pair: PAIR_USD_TRY,
            rate: newRate,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'currency_pair' }
        );

      if (upsertError) {
        console.error('Failed to cache exchange rate:', upsertError);
      }

      return newRate;
    } catch (error) {
      console.error('Error in ExchangeRateService:', error);
      // Fallback rate if everything fails (approximate)
      return 35.0;
    }
  },
};
