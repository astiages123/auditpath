import { BaseTask, type TaskResult } from "../base";
import { PromptArchitect } from "../../core/prompt/prompt-architect";
import { StructuredGenerator } from "../../core/llm/structured";
import { type GeneratedQuestion, GeneratedQuestionSchema } from "../drafting";
import type { ValidationResult } from "../validation";

// Reuse the specific retry prompt from generator.ts for revisions
const REVISION_RETRY_TEMPLATE = `BİR ÖNCEKİ CEVABIN JSON ŞEMASINA UYMUYORDU.
Lütfen geçerli bir JSON döndür.
Şema kuralları:
1. "o" dizisi TAM 5 elemanlı olmalı.
2. "a" (doğru cevap indexi) 0 ile 4 arasında bir sayı olmalı.
3. "img" görsel index numarası olmalıdır (Eğer görsel yoksa null).
4. "evidence" alanı kanıt cümlesini içermelidir (Boş olamaz).
5. Cevabın dışında hiçbir yorum veya açıklama ekleme. Sadece JSON verisi gerekli.`;

export interface RevisionTaskInput {
    originalQuestion: GeneratedQuestion;
    validationResult: ValidationResult;
    sharedContextPrompt: string; // Efficiency
    courseName?: string;
    sectionTitle?: string;
    guidelines?: any;
}

export class RevisionTask
    extends BaseTask<RevisionTaskInput, GeneratedQuestion> {
    async run(
        input: RevisionTaskInput,
        context?: any,
    ): Promise<TaskResult<GeneratedQuestion>> {
        const { originalQuestion, validationResult, sharedContextPrompt } =
            input;

        this.log(context, "Revising question...");

        const systemPrompt =
            "Sen KPSS formatında, akademik dille soru yazan uzman bir yapay zekasın. SADECE JSON formatında çıktı ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.";

        const revisionTask =
            `Aşağıdaki soru, belirtilen nedenlerle REDDEDİLMİŞTİR.
Lütfen geri bildirimi dikkate alarak soruyu revize et.
Sadece geri bildirimde belirtilen kritik hataları düzelt. Sorunun halihazırda doğru çalışan kısımlarını, soru kökünü veya şık yapısını (eğer hatasızlarsa) koruyarak revize et.

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
${validationResult.critical_faults.map((f) => `- ${f}`).join("\n")}

## İYİLEŞTİRME ÖNERİSİ:
${validationResult.improvement_suggestion}

Soruyu revize et. Hataları gider, akademik dili ve KPSS formatını koru, kanıt (evidence) alanını koru veya güncelle.
${REVISION_RETRY_TEMPLATE}`;

        const messages = PromptArchitect.assemble(
            systemPrompt,
            sharedContextPrompt,
            revisionTask,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: GeneratedQuestionSchema,
            provider: "mimo",
            temperature: 0.1,
            maxRetries: 2,
            retryPromptTemplate: REVISION_RETRY_TEMPLATE,
            onLog: (msg, details) => this.log(context, msg, details),
        });

        if (result) {
            const revised: GeneratedQuestion = {
                ...result,
                bloomLevel: originalQuestion.bloomLevel,
                img: originalQuestion.img, // preserve original logic
                concept: originalQuestion.concept,
            };
            return { success: true, data: revised };
        }

        return { success: false, error: "Revision failed" };
    }
}
