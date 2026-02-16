import { ConceptMapResult } from "@/features/quiz/types";
import { ConceptMapResponseSchema } from "@/features/quiz/types/quizEngineSchemas";
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
            `Ders Önem Derecesi: ${input.importance}\nLütfen kavram haritasını ve bilişsel zorluk endeksini oluştur. JSON formatında çıktı ver.`,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: ConceptMapResponseSchema,
            provider: "google",
            model: "gemini-2.5-flash",
            temperature: 1.0,
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
