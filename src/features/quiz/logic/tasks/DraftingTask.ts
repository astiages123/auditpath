import { ConceptMapItem, GeneratedQuestion } from "@/features/quiz/types";
import { GeneratedQuestionSchema } from "@/features/quiz/types/quizEngineSchemas";
import {
    buildDraftingTaskPrompt,
    GLOBAL_AI_SYSTEM_PROMPT,
} from "@/features/quiz/logic/prompts";
import {
    PromptArchitect,
    StructuredGenerator,
} from "@/features/quiz/logic/utils";
import { determineNodeStrategy } from "@/features/quiz/logic/algorithms/strategy";
import {
    BaseTask,
    FALLBACK_QUESTION,
    TaskContext,
    TaskResult,
} from "@/features/quiz/logic/tasks/base";
import { getAIConfig } from "@/utils/aiConfig";

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

        const aiConfig = getAIConfig();
        const systemPrompt = aiConfig.systemPromptPrefix
            ? aiConfig.systemPromptPrefix + "\n" + GLOBAL_AI_SYSTEM_PROMPT
            : GLOBAL_AI_SYSTEM_PROMPT;

        const messages = PromptArchitect.assemble(
            systemPrompt,
            sharedContextPrompt,
            taskPrompt +
                "\n\n### ZORUNLU JSON FORMATI\nLütfen cevabını sadece geçerli bir JSON objesi olarak, ```json ... ``` blokları içinde döndür.",
        );

        try {
            const result = await StructuredGenerator.generate(messages, {
                schema: GeneratedQuestionSchema,
                provider: aiConfig.provider,
                model: aiConfig.model,
                temperature: aiConfig.temperature,
                usageType: "drafting",
                maxTokens: 8192,
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
        } catch (error) {
            this.log(context, "Drafting failed", { error });
        }

        return { success: false, error: "Drafting failed" };
    }
}
