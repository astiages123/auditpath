import { z } from "zod";
import { BaseTask, type TaskResult } from "../base";
import { PromptArchitect } from "../../core/prompt/prompt-architect";
import { StructuredGenerator } from "../../core/llm/structured";
import { ANALYSIS_SYSTEM_PROMPT } from "../../core/prompt/library";

// --- Schemas ---
export const ConceptMapSchema = z.object({
    baslik: z.string(),
    odak: z.string().describe("15 kelimeyi geçmeyen öğrenme kazanımı"),
    seviye: z.enum(["Bilgi", "Uygulama", "Analiz"]),
    gorsel: z.string().nullable(),
    altText: z.string().describe("Görselin teknik açıklaması").nullable()
        .optional(),
    isException: z.boolean().optional().describe(
        "Eğer kavram bir istisna durumunu belirtiyorsa true",
    ),
    prerequisites: z.array(z.string()).optional().describe(
        "Önkoşul kavramların başlıkları",
    ),
});

export const ConceptMapResponseSchema = z.object({
    density_score: z.number().min(1).max(5).describe(
        "Metnin yoğunluk skoru (1: Basit, 5: Çok Ağır Doktrin)",
    ),
    concepts: z.array(ConceptMapSchema),
});

export type ConceptMapItem = z.infer<typeof ConceptMapSchema>;
export type ConceptMapResult = z.infer<typeof ConceptMapResponseSchema>;

// --- Input Interface ---
export interface AnalysisTaskInput {
    content: string;
    wordCount: number;
}

// --- Task Implementation ---
export class AnalysisTask
    extends BaseTask<AnalysisTaskInput, ConceptMapResult> {
    private calculateTargetCount(wordCount: number): number {
        const calculated = Math.floor(Math.sqrt(wordCount / 3));
        return Math.min(12, Math.max(5, calculated));
    }

    async run(
        input: AnalysisTaskInput,
        context?: any,
    ): Promise<TaskResult<ConceptMapResult>> {
        const targetCount = this.calculateTargetCount(input.wordCount);

        this.log(context, "Kavram haritası oluşturuluyor", {
            wordCount: input.wordCount,
            targetCount,
        });

        const systemPrompt = ANALYSIS_SYSTEM_PROMPT(targetCount);

        const contextPrompt = PromptArchitect.buildContext(
            PromptArchitect.cleanReferenceImages(input.content),
        );

        const messages = PromptArchitect.assemble(
            systemPrompt,
            contextPrompt,
            `Lütfen kavram haritasını ve yoğunluk skorunu oluştur.
            Çıktı formatı kesinlikle şu JSON yapısında olmalıdır:
            {
              "density_score": number, // 1-5
              "concepts": [
                {
                  "baslik": "Kavram Adı",
                  "odak": "Öğrenme kazanımı...",
                  "seviye": "Bilgi" | "Uygulama" | "Analiz",
                  "isException": boolean,
                  "gorsel": string | null,
                  "altText": string | null
                }
              ]
            }`,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: ConceptMapResponseSchema,
            provider: "google",
            model: "gemini-2.5-flash",
            onLog: (msg, details) => this.log(context, msg, details),
        });

        if (result) {
            return { success: true, data: result };
        }

        return { success: false, error: "Failed to generate concept map" };
    }
}
