import { GeneratedQuestion } from "@/features/quiz/types";
import {
    GeneratedQuestionSchema,
    ValidationResult,
} from "@/features/quiz/types";
import { GLOBAL_AI_SYSTEM_PROMPT } from "@/features/quiz/logic/prompts";
import {
    PromptArchitect,
    StructuredGenerator,
} from "@/features/quiz/logic/utils";
import {
    BaseTask,
    FALLBACK_QUESTION,
    TaskContext,
    TaskResult,
} from "@/features/quiz/logic/tasks/base";
import { getAIConfig } from "@/utils/aiConfig";

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

        const aiConfig = getAIConfig();
        const systemPrompt = aiConfig.systemPromptPrefix
            ? aiConfig.systemPromptPrefix + "\n" + GLOBAL_AI_SYSTEM_PROMPT
            : GLOBAL_AI_SYSTEM_PROMPT;

        const messages = PromptArchitect.assemble(
            systemPrompt,
            sharedContextPrompt,
            revisionTask,
        );

        try {
            const result = await StructuredGenerator.generate(messages, {
                schema: GeneratedQuestionSchema,
                provider: aiConfig.provider,
                model: aiConfig.model,
                temperature: aiConfig.temperature,
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
        } catch (error) {
            this.log(context, "Revision failed, using original or fallback", {
                error,
            });
        }

        // Fallback: If revision fails, return the original question (if valid-ish) or fallback
        return {
            success: true,
            data: {
                ...FALLBACK_QUESTION,
                concept: originalQuestion.concept,
            },
        };
    }
}
