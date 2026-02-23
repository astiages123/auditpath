import { PostgrestError } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { ApiResponse } from '@/types/common';

const safeQueryLogger = logger.withPrefix('[SafeQuery]');

/**
 * Standardized error handler for Supabase operations
 */
export async function handleSupabaseError(
  error: unknown,
  context: string,
  onRetry?: () => void
): Promise<void> {
  if (!error) return;

  const isPostgrest = (e: unknown): e is PostgrestError =>
    typeof e === 'object' && e !== null && 'code' in e && 'message' in e;

  const details = isPostgrest(error)
    ? { code: error.code, message: error.message, hint: error.hint }
    : error;

  logger.error(
    `[${context}] failed`,
    details instanceof Error ? details : { details }
  );

  if (onRetry) {
    onRetry();
  }
}

/**
 * Result type for safe queries, aligning with ApiResponse structure
 */
export interface SafeQueryResult<T> extends ApiResponse<T> {
  count: number | null;
}

/**
 * Safely executes a Supabase query promise
 */
export async function safeQuery<T>(
  queryPromise: PromiseLike<{
    data: T | null;
    error: unknown;
    count?: number | null;
  }>,
  errorMessage: string,
  context?: Record<string, unknown>
): Promise<SafeQueryResult<T>> {
  try {
    const { data, error, count } = await queryPromise;

    if (error) {
      const message = (error as { message?: string })?.message || errorMessage;
      safeQueryLogger.error(message, { ...context, error });
      return {
        success: false,
        data: undefined,
        error: message,
        count: count ?? null,
      };
    }

    return {
      success: true,
      data: data ?? undefined,
      error: undefined,
      count: count ?? null,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    safeQueryLogger.error(`Unexpected error: ${errorMessage}`, {
      ...context,
      error: err,
    });
    return {
      success: false,
      data: undefined,
      error,
      count: null,
    };
  }
}
