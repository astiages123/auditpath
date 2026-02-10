import { ValidationResult } from "../schemas";
import { ValidationResultSchema } from "../schemas";
import {
    buildValidationTaskPrompt,
    VALIDATION_SYSTEM_PROMPT,
} from "../prompts";
import { PromptArchitect, StructuredGenerator } from "../utils";
import { BaseTask, TaskContext, TaskResult } from "./base-task";

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

export class ValidationTask
    extends BaseTask<ValidationTaskInput, ValidationResult> {
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
