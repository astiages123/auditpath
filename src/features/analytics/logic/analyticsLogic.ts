import { eachDayOfInterval, format, startOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import { formatDateKey } from '@/utils/dateUtils';
import { logger } from '@/utils/logger';

// --- Constants ---

// Use a scaling factor to perform integer arithmetic for currency to avoid floating point errors.
// e.g. $0.0001 -> 1 (if factor is 10000)
const CURRENCY_SCALING_FACTOR = 10000;

// --- Zod Schemas ---

import {
  AiGenerationCost,
  AiGenerationCostSchema,
} from '../types/analyticsTypes';

export { type AiGenerationCost, AiGenerationCostSchema };

// --- Helper Functions ---

/**
 * Validates and sanitizes raw log data from Supabase.
 * Invalid entries are logged to console (in dev) and skipped.
 */
export function validateLogs(rawLogs: unknown[]): AiGenerationCost[] {
  const validLogs: AiGenerationCost[] = [];
  rawLogs.forEach((log) => {
    const result = AiGenerationCostSchema.safeParse(log);
    if (result.success) {
      validLogs.push(result.data);
    } else {
      logger.warn('Invalid analytics log entry skipped:', {
        error: result.error,
      });
    }
  });
  return validLogs;
}

/**
 * Processes daily data for the chart using an optimized O(N) approach.
 * Aggregates costs by date using a Map to avoid nested loops.
 *
 * @param logs Validated logs
 * @param rate Current USD/TRY exchange rate
 * @returns Array of data points for the Recharts AreaChart
 */
export function processDailyData(logs: AiGenerationCost[], rate: number) {
  if (logs.length === 0) return [];

  // 1. Determine Date Range
  // We need the min date to start the chart, and we go up to today.
  const timestamps = logs
    .map((l) => (l.created_at ? new Date(l.created_at).getTime() : 0))
    .filter((t) => t > 0);

  if (timestamps.length === 0) return [];

  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date();

  // 2. Aggregate Costs into a Map (O(M) where M is logs length)
  // Key: YYYY-MM-DD, Value: Scaled USD Cost (Integer)
  const dailyCostsMap = new Map<string, number>();

  for (const log of logs) {
    if (!log.created_at) continue;

    // safe date key generation
    const dateKey = formatDateKey(new Date(log.created_at));

    // precise integer addition
    const currentTotal = dailyCostsMap.get(dateKey) || 0;

    const logCost = log.cost_usd || 0;

    // Math.round to ensure we land on an integer after scaling
    const scaledCost = Math.round(logCost * CURRENCY_SCALING_FACTOR);

    dailyCostsMap.set(dateKey, currentTotal + scaledCost);
  }

  // 3. Generate Chart Data (O(D) where D is days in range)
  const days = eachDayOfInterval({
    start: startOfWeek(minDate, { locale: tr }),
    end: maxDate,
  });

  return days.map((day) => {
    const dateKey = formatDateKey(day);
    const scaledCostUsd = dailyCostsMap.get(dateKey) || 0;

    // Convert back to float USD, then to TRY, then format
    const costUsd = scaledCostUsd / CURRENCY_SCALING_FACTOR;
    const costTry = costUsd * rate;

    // Final formatting for simple display use (optional, but requested in original code)
    // We return raw number for Recharts, let the Chart formatter handle string display
    // But we fix to 4 decimals to avoid tiny float artifacts
    const parsedCost = parseFloat(costTry.toFixed(4));

    return {
      date: format(day, 'dd MMM', { locale: tr }),
      cost: parsedCost,
      fullDate: format(day, 'dd MMMM yyyy', { locale: tr }),
      // original data structure required specific fields, keeping them:
      timestamp: day.getTime(),
    };
  });
}

/**
 * Calculates total cost safely using integer math.
 */
export function calculateTotalCostUsd(logs: AiGenerationCost[]): number {
  const totalScaled = logs.reduce((acc, log) => {
    const cost = log.cost_usd || 0;
    return acc + Math.round(cost * CURRENCY_SCALING_FACTOR);
  }, 0);

  return totalScaled / CURRENCY_SCALING_FACTOR;
}

/**
 * Calculates cache hit rate percentage.
 */
export function calculateCacheHitRate(logs: AiGenerationCost[]): number {
  // Sadece önbellek mekanizması olan modelleri hesaplamaya dahil et
  const eligibleLogs = logs.filter(
    (l) =>
      l.provider?.toLowerCase() === 'mimo' ||
      l.provider?.toLowerCase() === 'deepseek'
  );

  const totalPromptTokens = eligibleLogs.reduce(
    (acc, l) => acc + (l.prompt_tokens || 0),
    0
  );
  if (totalPromptTokens === 0) return 0;

  const totalCachedTokens = eligibleLogs.reduce(
    (acc, l) => acc + (l.cached_tokens || 0),
    0
  );
  return (totalCachedTokens / totalPromptTokens) * 100;
}
