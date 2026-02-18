import { PostgrestError } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { addToOfflineQueue } from '@/shared/services/offlineQueueService';

const safeQueryLogger = logger.withPrefix('[SafeQuery]');

/**
 * Standardized error handler for Supabase operations
 */
export async function handleSupabaseError(
  error: unknown,
  context: string
): Promise<void> {
  if (!error) return;

  const isPostgrest = (e: unknown): e is PostgrestError =>
    typeof e === 'object' && e !== null && 'code' in e && 'message' in e;
  const details = isPostgrest(error)
    ? { code: error.code, message: error.message, hint: error.hint }
    : error;

  logger.error(`[${context}] failed`, { details });
}

export async function safeQuery<T = unknown>(
  queryPromise: PromiseLike<{ data: T | null; error: unknown }>,
  errorMessage: string,
  context?: Record<string, unknown>,
  offlinePayload?: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await queryPromise;

    if (error) {
      safeQueryLogger.error(errorMessage, { ...context, error });
      if (offlinePayload) {
        addToOfflineQueue(offlinePayload);
      }
      return {
        data: null,
        error: new Error(
          (error as { message?: string })?.message || 'Query error'
        ),
      };
    }

    return { data, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    safeQueryLogger.error(`Unexpected error: ${errorMessage}`, {
      ...context,
      error,
    });
    if (offlinePayload) {
      addToOfflineQueue(offlinePayload);
    }
    return { data: null, error };
  }
}
