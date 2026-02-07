import { z } from "zod";
import { BaseTask, type TaskResult } from "../base";
import { PromptArchitect } from "../../core/prompt/prompt-architect";
import { StructuredGenerator } from "../../core/llm/structured";
import {
    buildDraftingTaskPrompt,
    DRAFTING_SYSTEM_PROMPT,
} from "../../core/prompt/library";
import type { ConceptMapItem } from "../analysis";
import { determineNodeStrategy } from "../strategy";

// --- Schemas ---
export const GeneratedQuestionSchema = z.object({
    q: z.string().min(10, "Soru metni çok kısa"),
    o: z.array(z.string()).length(5, "Tam olarak 5 seçenek olmalı"),
    a: z.number().int().min(0).max(4),
    exp: z.string().min(10, "Açıklama metni çok kısa"),
    evidence: z.string().min(1, "Kanıt cümlesi zorunludur"),
    img: z.number().nullable().optional(),
    diagnosis: z.string().max(500).optional(),
    insight: z.string().max(500).optional(),
});

export type GeneratedQuestionType = z.infer<typeof GeneratedQuestionSchema>;

export interface GeneratedQuestion extends GeneratedQuestionType {
    img?: number | null;
    bloomLevel: "knowledge" | "application" | "analysis";
    concept: string;
}

// --- Input Interface ---
export interface DraftingTaskInput {
    concept: ConceptMapItem;
    index: number;
    wordCount: number;
    courseName: string;
    usageType?: "antrenman" | "deneme" | "arsiv";
    previousDiagnoses?: string[];
    sharedContextPrompt: string; // Pre-built context prompt for efficiency
}

// --- Task Implementation ---
export class DraftingTask
    extends BaseTask<DraftingTaskInput, GeneratedQuestion> {
    private buildTaskPrompt(
        concept: ConceptMapItem,
        strategy: { bloomLevel: string; instruction: string },
        usageType: "antrenman" | "deneme" | "arsiv" = "antrenman",
        previousDiagnoses?: string[],
    ): string {
        return buildDraftingTaskPrompt(
            concept,
            strategy,
            usageType,
            previousDiagnoses,
        );
    }

    async run(
        input: DraftingTaskInput,
        context?: any,
    ): Promise<TaskResult<GeneratedQuestion>> {
        const {
            concept,
            index,
            wordCount,
            courseName,
            usageType = "antrenman",
            previousDiagnoses,
            sharedContextPrompt,
        } = input;

        const strategy = determineNodeStrategy(
            index,
            wordCount,
            concept,
            courseName,
        );
        this.log(context, `Drafting Question for: ${concept.baslik}`, {
            strategy: strategy.bloomLevel,
        });

        const taskPrompt = this.buildTaskPrompt(
            concept,
            strategy,
            usageType,
            previousDiagnoses,
        );

        const systemPrompt = DRAFTING_SYSTEM_PROMPT;

        const messages = PromptArchitect.assemble(
            systemPrompt,
            sharedContextPrompt,
            taskPrompt,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: GeneratedQuestionSchema,
            provider: "mimo",
            temperature: 0.1,
            onLog: (msg, details) => this.log(context, msg, details),
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
