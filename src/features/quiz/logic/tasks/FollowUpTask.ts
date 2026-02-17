import { GeneratedQuestion } from "@/features/quiz/types";
import { GeneratedQuestionSchema } from "@/features/quiz/types";
import {
    buildFollowUpTaskPrompt,
    GLOBAL_AI_SYSTEM_PROMPT,
} from "@/features/quiz/logic/prompts";
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
import * as Repository from "@/features/quiz/services/repositories/quizRepository";

export interface WrongAnswerContext {
    chunkId: string;
    originalQuestion: {
        id: string;
        q: string;
        o: string[];
        a: number;
        exp: string;
        evidence: string;
        img?: number | null;
        bloomLevel?: string;
        concept: string;
    };
    incorrectOptionIndex: number;
    correctOptionIndex: number;
    courseId: string;
    userId: string;
}

export interface FollowUpTaskInput {
    context: WrongAnswerContext;
    evidence: string;
    chunkContent: string;
    courseName: string;
    sectionTitle: string;
    guidelines: {
        instruction?: string | undefined;
        few_shot_example?: unknown;
        bad_few_shot_example?: unknown;
    };
}

export class FollowUpTask extends BaseTask<
    FollowUpTaskInput,
    GeneratedQuestion
> {
    async run(
        input: FollowUpTaskInput,
        context?: TaskContext,
    ): Promise<TaskResult<GeneratedQuestion>> {
        const { id: originalId, bloomLevel: originalBloom } =
            input.context.originalQuestion;
        const { userId, chunkId } = input.context;
        const { evidence, chunkContent, courseName, sectionTitle, guidelines } =
            input;

        this.log(context, "Generating Follow-up question...");

        const statusData = await Repository.getUserQuestionStatus(
            userId,
            originalId,
        );

        const consecutiveFails = statusData?.consecutive_fails ?? 0;
        let targetBloomLevel = (originalBloom || "application") as
            | "knowledge"
            | "application"
            | "analysis";
        let scaffoldingNote = "";

        if (consecutiveFails >= 2) {
            if (targetBloomLevel === "analysis") {
                targetBloomLevel = "application";
            } else if (targetBloomLevel === "application") {
                targetBloomLevel = "knowledge";
            }
            scaffoldingNote =
                `\n**SCAFFOLDING AKTİF**: Kullanıcı bu konuda zorlanıyor (Hata #${consecutiveFails}). Soruyu BİR ALT BİLİŞSEL SEVİYEYE (${targetBloomLevel}) indir.`;
        }

        const previousDiagnoses = await Repository.getRecentDiagnoses(
            userId,
            chunkId,
            3,
        );

        const contextPrompt = PromptArchitect.buildContext(
            PromptArchitect.cleanReferenceImages(chunkContent),
            courseName,
            sectionTitle,
            guidelines,
        );

        const originalQuestionJson = {
            q: input.context.originalQuestion.q,
            o: input.context.originalQuestion.o,
            a: input.context.originalQuestion.a,
            exp: input.context.originalQuestion.exp,
            img: input.context.originalQuestion.img ?? null,
        };

        const taskPrompt = buildFollowUpTaskPrompt(
            evidence,
            originalQuestionJson,
            input.context.incorrectOptionIndex,
            input.context.correctOptionIndex,
            targetBloomLevel,
            scaffoldingNote,
            previousDiagnoses,
        );

        const aiConfig = getAIConfig();
        const systemPrompt = aiConfig.systemPromptPrefix
            ? aiConfig.systemPromptPrefix + "\n" + GLOBAL_AI_SYSTEM_PROMPT
            : GLOBAL_AI_SYSTEM_PROMPT;

        const messages = PromptArchitect.assemble(
            systemPrompt,
            contextPrompt,
            taskPrompt,
        );

        try {
            const result = await StructuredGenerator.generate(messages, {
                schema: GeneratedQuestionSchema,
                provider: aiConfig.provider,
                model: aiConfig.model,
                temperature: aiConfig.temperature,
                onLog: (msg: string, details?: Record<string, unknown>) =>
                    this.log(context, msg, details),
            });

            if (result) {
                return {
                    success: true,
                    data: {
                        ...result,
                        bloomLevel: targetBloomLevel,
                        img: input.context.originalQuestion.img ?? null,
                        concept: input.context.originalQuestion.concept,
                    },
                };
            }
        } catch (error) {
            this.log(context, "Follow-up generation failed, using fallback", {
                error,
            });
        }

        return {
            success: true,
            data: {
                ...FALLBACK_QUESTION,
                concept: input.context.originalQuestion.concept,
            },
        };
    }
}
