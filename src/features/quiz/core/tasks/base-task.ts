import { logger } from '@/shared/lib/core/utils/logger';

export interface TaskContext {
  jobId?: string;
  traceId?: string;
  logger?: (msg: string, details?: Record<string, unknown>) => void;
}

export interface TaskResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

export abstract class BaseTask<TInput, TOutput> {
  abstract run(
    input: TInput,
    context?: TaskContext
  ): Promise<TaskResult<TOutput>>;

  protected log(
    context: TaskContext | undefined,
    msg: string,
    details?: unknown
  ) {
    if (context?.logger) {
      context.logger(msg, details as Record<string, unknown>);
    } else {
      logger.debug(`[Task] ${msg}`, details ? { details } : undefined);
    }
  }
}
