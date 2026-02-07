import { z } from "zod";
import { BaseTask, type TaskResult } from "../base";
import { PromptArchitect } from "../../core/prompt/prompt-architect";
import { StructuredGenerator } from "../../core/llm/structured";
import {
    buildValidationTaskPrompt,
    VALIDATION_SYSTEM_PROMPT,
} from "../../core/prompt/library";

// --- Schemas ---
export const ValidationResultSchema = z.object({
    total_score: z.number().min(0).max(100),
    decision: z.enum(["APPROVED", "REJECTED"]),
    critical_faults: z.array(z.string()).default([]),
    improvement_suggestion: z.string().default(""),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export interface QuestionToValidate {
    q: string;
    o: string[];
    a: number;
    exp: string;
    bloomLevel?: "knowledge" | "application" | "analysis";
    img?: number | null;
}

// --- Input Interface ---
export interface ValidationTaskInput {
    question: QuestionToValidate;
    content: string; // Raw source content for validation
}

// --- Task Implementation ---
export class ValidationTask
    extends BaseTask<ValidationTaskInput, ValidationResult> {
    private buildTaskPrompt(question: QuestionToValidate): string {
        return buildValidationTaskPrompt(question);
    }

    async run(
        input: ValidationTaskInput,
        context?: any,
    ): Promise<TaskResult<ValidationResult>> {
        const { question, content } = input;

        this.log(context, "Validating question...");

        const systemPrompt = VALIDATION_SYSTEM_PROMPT;

        const contextPrompt = PromptArchitect.buildContext(
            PromptArchitect.cleanReferenceImages(content),
        );

        const taskPrompt = this.buildTaskPrompt(question);

        const messages = PromptArchitect.assemble(
            systemPrompt,
            contextPrompt,
            taskPrompt,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: ValidationResultSchema,
            provider: "cerebras", // Validator uses gpt-oss-120b
        });

        if (result) {
            // Logic to enforce approved format
            if (result.decision === "APPROVED") {
                result.critical_faults = [];
                result.improvement_suggestion = "";
            }
            return { success: true, data: result };
        }

        return { success: false, error: "Validation failed" };
    }
}
