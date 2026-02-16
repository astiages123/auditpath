import { logger } from '@/utils/logger';
import { addToOfflineQueue } from '@/lib/offlineQueueService';

const safeQueryLogger = logger.withPrefix('[SafeQuery]');

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
