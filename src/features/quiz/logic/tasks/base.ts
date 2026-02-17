import { logger } from "@/utils/logger";
import { GeneratedQuestion } from "@/features/quiz/types/quizTypes";

export const FALLBACK_QUESTION: GeneratedQuestion = {
    q: "Bu soru şu an yüklenemedi. Lütfen 'Sonraki Soru' butonuna basarak devam ediniz. (Sistem güvenliği için otomatik placeholder)",
    o: [
        "Cevap A",
        "Cevap B",
        "Cevap C",
        "Cevap D",
        "Cevap E",
    ],
    a: 0,
    exp: "Bu bir yedek sorudur. Asıl soru oluşturulurken bir hata meydana geldi.",
    evidence: "Sistem Hatası",
    concept: "Hata Yönetimi",
    bloomLevel: "knowledge",
};

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
        context?: TaskContext,
    ): Promise<TaskResult<TOutput>>;

    protected log(
        context: TaskContext | undefined,
        msg: string,
        details?: unknown,
    ) {
        if (context?.logger) {
            context.logger(msg, details as Record<string, unknown>);
        } else {
            logger.debug(`[Task] ${msg}`, details ? { details } : undefined);
        }
    }
}
