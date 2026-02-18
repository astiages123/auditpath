import { ConceptMapResult } from "@/features/quiz/types";
import { ConceptMapResponseSchema } from "@/features/quiz/types";
import { ANALYSIS_SYSTEM_PROMPT } from "@/features/quiz/logic/prompts";
import {
    PromptArchitect,
    StructuredGenerator,
} from "@/features/quiz/logic/utils";
import {
    BaseTask,
    TaskContext,
    TaskResult,
} from "@/features/quiz/logic/tasks/base";
import { getAIConfig } from "@/utils/aiConfig";

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
        this.log(context, "İçerik derinliği inceleniyor...", {
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

        const aiConfig = getAIConfig();
        const finalSystemPrompt = aiConfig.systemPromptPrefix
            ? aiConfig.systemPromptPrefix + "\n" + systemPrompt
            : systemPrompt;

        const messages = PromptArchitect.assemble(
            finalSystemPrompt,
            contextPrompt,
            `Ders Önem Derecesi: ${input.importance}\nLütfen kavram haritasını ve bilişsel zorluk endeksini oluştur. JSON formatında çıktı ver.`,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: ConceptMapResponseSchema,
            provider: aiConfig.provider,
            model: aiConfig.model,
            temperature: aiConfig.temperature,
            usageType: "analysis",
            maxTokens: 8192,
            onLog: (msg: string, details?: Record<string, unknown>) => {
                this.log(context, msg, details);
            },
        });

        if (result) return { success: true, data: result };
        return { success: false, error: "Kavram haritası oluşturulamadı." };
    }
}
