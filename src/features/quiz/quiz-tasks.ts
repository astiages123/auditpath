import { logger } from "@/utils/logger";
import {
    ConceptMapItem,
    ConceptMapResult,
    GeneratedQuestion,
} from "@/features/quiz/quiz.types";
import {
    ConceptMapResponseSchema,
    GeneratedQuestionSchema,
    ValidationResult,
    ValidationResultSchema,
} from "./quiz-engine-schemas";
import {
    ANALYSIS_SYSTEM_PROMPT,
    buildDraftingTaskPrompt,
    buildFollowUpTaskPrompt,
    buildValidationTaskPrompt,
    GLOBAL_AI_SYSTEM_PROMPT,
    VALIDATION_SYSTEM_PROMPT,
} from "./quiz-prompts";
import { PromptArchitect, StructuredGenerator } from "./quiz-utils";
import { determineNodeStrategy } from "@/features/quiz/quiz-logic";
import * as Repository from "@/features/quiz/quiz-repository";

// --- Base Task ---

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

// --- Analysis Task ---

export interface AnalysisTaskInput {
    content: string;
    courseName: string;
    sectionTitle: string;
    importance: "high" | "medium" | "low";
}

export class AnalysisTask extends BaseTask<
    AnalysisTaskInput,
    ConceptMapResult
> {
    async run(
        input: AnalysisTaskInput,
        context?: TaskContext,
    ): Promise<TaskResult<ConceptMapResult>> {
        this.log(context, "Bilişsel Analiz Yapılıyor (Öğrenme Doygunluğu)", {
            course: input.courseName,
            section: input.sectionTitle,
            importance: input.importance,
        });

        const systemPrompt = ANALYSIS_SYSTEM_PROMPT(
            input.sectionTitle,
            input.courseName,
            input.importance,
        );

        const contextPrompt = PromptArchitect.buildContext(
            PromptArchitect.cleanReferenceImages(input.content),
        );

        const messages = PromptArchitect.assemble(
            systemPrompt,
            contextPrompt,
            `Ders Önem Derecesi: ${input.importance}\nLütfen kavram haritasını, bilişsel zorluk endeksini ve ideal öğrenme kotalarını oluştur. JSON formatında çıktı ver.`,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: ConceptMapResponseSchema,
            provider: "google",
            model: "gemini-2.5-flash",
            usageType: "analysis",
            maxTokens: 8192,
            onLog: (msg: string, details?: Record<string, unknown>) => {
                this.log(context, msg, details);
            },
        });

        if (result) return { success: true, data: result };
        return { success: false, error: "Failed to generate concept map" };
    }
}

// --- Drafting Task ---

export interface DraftingTaskInput {
    concept: ConceptMapItem;
    index: number;
    courseName: string;
    usageType?: "antrenman" | "deneme" | "arsiv";
    previousDiagnoses?: string[];
    sharedContextPrompt: string;
}

export class DraftingTask extends BaseTask<
    DraftingTaskInput,
    GeneratedQuestion
> {
    async run(
        input: DraftingTaskInput,
        context?: TaskContext,
    ): Promise<TaskResult<GeneratedQuestion>> {
        const {
            concept,
            index,
            courseName,
            usageType = "antrenman",
            previousDiagnoses,
            sharedContextPrompt,
        } = input;

        const strategy = determineNodeStrategy(index, concept, courseName);
        this.log(context, `Drafting Question for: ${concept.baslik}`, {
            strategy: strategy.bloomLevel,
        });

        const taskPrompt = buildDraftingTaskPrompt(
            concept,
            strategy,
            usageType,
            previousDiagnoses,
        );

        const messages = PromptArchitect.assemble(
            GLOBAL_AI_SYSTEM_PROMPT,
            sharedContextPrompt,
            taskPrompt,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: GeneratedQuestionSchema,
            provider: "mimo",
            temperature: 0.1,
            usageType: "drafting",
            onLog: (msg: string, details?: Record<string, unknown>) =>
                this.log(context, msg, details),
        });

        if (result) {
            const question: GeneratedQuestion = {
                ...result,
                bloomLevel: strategy.bloomLevel,
                img: result.img ?? null,
                concept: concept.baslik,
            };
            return { success: true, data: question };
        }

        return { success: false, error: "Failed to generate question" };
    }
}

// --- Follow-Up Task ---

export interface WrongAnswerContext {
    chunkId: string;
    originalQuestion: {
        id: string;
        q: string;
        o: string[];
        a: number;
        exp: string;
        evidence: string;
        img?: number | null;
        bloomLevel?: string;
        concept: string;
    };
    incorrectOptionIndex: number;
    correctOptionIndex: number;
    courseId: string;
    userId: string;
}

export interface FollowUpTaskInput {
    context: WrongAnswerContext;
    evidence: string;
    chunkContent: string;
    courseName: string;
    sectionTitle: string;
    guidelines: {
        instruction?: string | undefined;
        few_shot_example?: unknown;
        bad_few_shot_example?: unknown;
    };
}

export class FollowUpTask extends BaseTask<
    FollowUpTaskInput,
    GeneratedQuestion
> {
    async run(
        input: FollowUpTaskInput,
        context?: TaskContext,
    ): Promise<TaskResult<GeneratedQuestion>> {
        const { id: originalId, bloomLevel: originalBloom } =
            input.context.originalQuestion;
        const { userId, chunkId } = input.context;
        const { evidence, chunkContent, courseName, sectionTitle, guidelines } =
            input;

        this.log(context, "Generating Follow-up question...");

        const statusData = await Repository.getUserQuestionStatus(
            userId,
            originalId,
        );

        const consecutiveFails = statusData?.consecutive_fails ?? 0;
        let targetBloomLevel = (originalBloom || "application") as
            | "knowledge"
            | "application"
            | "analysis";
        let scaffoldingNote = "";

        if (consecutiveFails >= 2) {
            if (targetBloomLevel === "analysis") {
                targetBloomLevel = "application";
            } else if (targetBloomLevel === "application") {
                targetBloomLevel = "knowledge";
            }
            scaffoldingNote =
                `\n**SCAFFOLDING AKTİF**: Kullanıcı bu konuda zorlanıyor (Hata #${consecutiveFails}). Soruyu BİR ALT BİLİŞSEL SEVİYEYE (${targetBloomLevel}) indir.`;
        }

        const previousDiagnoses = await Repository.getRecentDiagnoses(
            userId,
            chunkId,
            3,
        );

        const contextPrompt = PromptArchitect.buildContext(
            PromptArchitect.cleanReferenceImages(chunkContent),
            courseName,
            sectionTitle,
            guidelines,
        );

        const originalQuestionJson = {
            q: input.context.originalQuestion.q,
            o: input.context.originalQuestion.o,
            a: input.context.originalQuestion.a,
            exp: input.context.originalQuestion.exp,
            img: input.context.originalQuestion.img ?? null,
        };

        const taskPrompt = buildFollowUpTaskPrompt(
            evidence,
            originalQuestionJson,
            input.context.incorrectOptionIndex,
            input.context.correctOptionIndex,
            targetBloomLevel,
            scaffoldingNote,
            previousDiagnoses,
        );

        const messages = PromptArchitect.assemble(
            GLOBAL_AI_SYSTEM_PROMPT,
            contextPrompt,
            taskPrompt,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: GeneratedQuestionSchema,
            provider: "mimo",
            temperature: 0.1,
            onLog: (msg: string, details?: Record<string, unknown>) =>
                this.log(context, msg, details),
        });

        if (result) {
            return {
                success: true,
                data: {
                    ...result,
                    bloomLevel: targetBloomLevel,
                    img: input.context.originalQuestion.img ?? null,
                    concept: input.context.originalQuestion.concept,
                },
            };
        }

        return { success: false, error: "Follow-up generation failed" };
    }
}

// --- Revision Task ---

export interface RevisionTaskInput {
    originalQuestion: GeneratedQuestion;
    validationResult: ValidationResult;
    sharedContextPrompt: string;
}

export class RevisionTask extends BaseTask<
    RevisionTaskInput,
    GeneratedQuestion
> {
    async run(
        input: RevisionTaskInput,
        context?: TaskContext,
    ): Promise<TaskResult<GeneratedQuestion>> {
        const { originalQuestion, validationResult, sharedContextPrompt } =
            input;
        this.log(context, "Revising question...");

        const REVISION_RETRY_TEMPLATE =
            `BİR ÖNCEKİ CEVABIN JSON ŞEMASINA UYMUYORDU.
        Lütfen geçerli bir JSON döndür.
        Şema kuralları:
        1. "o" dizisi TAM 5 elemanlı olmalı.
        2. "a" (doğru cevap indexi) 0 ile 4 arasında bir sayı olmalı.
        3. "img" görsel index numarası olmalıdır (Eğer görsel yoksa null).
        4. "evidence" alanı kanıt cümlesini içermelidir (Boş olamaz).
        5. Cevabın dışında hiçbir yorum veya açıklama ekleme. Sadece JSON verisi gerekli.`;

        const revisionTask =
            `Aşağıdaki soru, belirtilen nedenlerle REDDEDİLMİŞTİR.
        Lütfen geri bildirimi dikkate alarak soruyu revize et.
        
        ## REDDEDİLEN SORU:
        ${
                JSON.stringify(
                    {
                        q: originalQuestion.q,
                        o: originalQuestion.o,
                        a: originalQuestion.a,
                        exp: originalQuestion.exp,
                    },
                    null,
                    2,
                )
            }
        
        ## RET NEDENLERİ (KRİTİK HATALAR):
        ${
                validationResult.critical_faults
                    .map((f: string) => `- ${f}`)
                    .join("\n")
            }
        
        ## İYİLEŞTİRME ÖNERİSİ:
        ${validationResult.improvement_suggestion}
        
        Soruyu revize et. Hataları gider, akademik dili koru.
        ${REVISION_RETRY_TEMPLATE}`;

        const messages = PromptArchitect.assemble(
            GLOBAL_AI_SYSTEM_PROMPT,
            sharedContextPrompt,
            revisionTask,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: GeneratedQuestionSchema,
            provider: "mimo",
            temperature: 0.1,
            maxRetries: 2,
            usageType: "revision",
            retryPromptTemplate: REVISION_RETRY_TEMPLATE,
            onLog: (msg: string, details?: Record<string, unknown>) =>
                this.log(context, msg, details),
        });

        if (result) {
            const revised: GeneratedQuestion = {
                ...result,
                bloomLevel: originalQuestion.bloomLevel,
                img: originalQuestion.img,
                concept: originalQuestion.concept,
            };
            return { success: true, data: revised };
        }

        return { success: false, error: "Revision failed" };
    }
}

// --- Validation Task ---

export interface QuestionToValidate {
    q: string;
    o: string[];
    a: number;
    exp: string;
    bloomLevel?: "knowledge" | "application" | "analysis";
    img?: number | null;
}

export interface ValidationTaskInput {
    question: QuestionToValidate;
    content: string;
}

export class ValidationTask extends BaseTask<
    ValidationTaskInput,
    ValidationResult
> {
    async run(
        input: ValidationTaskInput,
        context?: TaskContext,
    ): Promise<TaskResult<ValidationResult>> {
        const { question, content } = input;
        this.log(context, "Validating question...");

        const contextPrompt = PromptArchitect.buildContext(
            PromptArchitect.cleanReferenceImages(content),
        );
        const taskPrompt = buildValidationTaskPrompt(question);
        const messages = PromptArchitect.assemble(
            VALIDATION_SYSTEM_PROMPT,
            contextPrompt,
            taskPrompt,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: ValidationResultSchema,
            provider: "cerebras",
            usageType: "validation",
            onLog: (msg: string, details?: Record<string, unknown>) =>
                this.log(context, msg, details),
        });

        if (result) {
            // Sanity Check: Score and Decision consistency
            if (result.total_score >= 70 && result.decision === "REJECTED") {
                result.decision = "APPROVED";
            } else if (
                result.total_score < 70 && result.decision === "APPROVED"
            ) {
                result.decision = "REJECTED";
            }

            if (result.decision === "APPROVED") {
                result.critical_faults = [];
                result.improvement_suggestion = "";
            }
            return { success: true, data: result };
        }

        return { success: false, error: "Validation failed" };
    }
}
