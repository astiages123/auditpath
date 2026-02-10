import { GeneratedQuestion } from "../types";
import { GeneratedQuestionSchema, ValidationResult } from "../schemas";
import { GLOBAL_AI_SYSTEM_PROMPT } from "../prompts";
import { PromptArchitect, StructuredGenerator } from "../utils";
import { BaseTask, TaskContext, TaskResult } from "./base-task";

export interface RevisionTaskInput {
    originalQuestion: GeneratedQuestion;
    validationResult: ValidationResult;
    sharedContextPrompt: string;
}

export class RevisionTask
    extends BaseTask<RevisionTaskInput, GeneratedQuestion> {
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
                validationResult.critical_faults.map((f: string) => `- ${f}`)
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
