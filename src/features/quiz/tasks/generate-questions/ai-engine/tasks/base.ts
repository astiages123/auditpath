export interface TaskContext {
    jobId?: string;
    traceId?: string;
    logger?: (msg: string, details?: any) => void;
}

export interface TaskResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    metadata?: Record<string, any>;
}

export abstract class BaseTask<TInput, TOutput> {
    abstract run(
        input: TInput,
        context?: TaskContext,
    ): Promise<TaskResult<TOutput>>;

    protected log(
        context: TaskContext | undefined,
        msg: string,
        details?: any,
    ) {
        if (context?.logger) {
            context.logger(msg, details);
        } else {
            console.log(`[Task] ${msg}`, details || "");
        }
    }
}
