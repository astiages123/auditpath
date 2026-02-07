import { BaseTask, type TaskResult } from "../base";
import { PromptArchitect } from "../../core/prompt/prompt-architect";
import { StructuredGenerator } from "../../core/llm/structured";
import { type GeneratedQuestion, GeneratedQuestionSchema } from "../drafting";
import { supabase } from "@/shared/lib/core/supabase";
import {
    buildFollowUpTaskPrompt,
    FOLLOWUP_SYSTEM_PROMPT,
} from "../../core/prompt/library";

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
    guidelines: any;
}

export class FollowUpTask
    extends BaseTask<FollowUpTaskInput, GeneratedQuestion> {
    async run(
        input: FollowUpTaskInput,
        context?: any,
    ): Promise<TaskResult<GeneratedQuestion>> {
        const { id: originalId, bloomLevel: originalBloom } =
            input.context.originalQuestion;
        const { userId, chunkId } = input.context;
        const { evidence, chunkContent, courseName, sectionTitle, guidelines } =
            input;

        this.log(context, "Generating Follow-up question...");

        // --- SCAFFOLDING LOGIC ---
        const { data: statusData } = await supabase
            .from("user_question_status")
            .select("consecutive_fails")
            .eq("user_id", userId)
            .eq("question_id", originalId)
            .maybeSingle();

        const consecutiveFails = (statusData as any)?.consecutive_fails ?? 0;
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

        // --- COGNITIVE MEMORY ---
        const { data: pastDiagnoses } = await supabase
            .from("user_quiz_progress")
            .select("ai_diagnosis")
            .eq("user_id", userId)
            .eq("chunk_id", chunkId)
            .not("ai_diagnosis", "is", null)
            .order("answered_at", { ascending: false })
            .limit(10);

        const allDiagnoses =
            (pastDiagnoses as { ai_diagnosis: string | null }[])
                ?.map((p) => p.ai_diagnosis)
                .filter((d): d is string => Boolean(d)) || [];
        const previousDiagnoses = Array.from(new Set(allDiagnoses)).slice(0, 3);

        const systemPrompt = FOLLOWUP_SYSTEM_PROMPT;

        const cleanContent = PromptArchitect.cleanReferenceImages(chunkContent);
        const contextPrompt = PromptArchitect.buildContext(
            cleanContent,
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
            previousDiagnoses as string[],
        );

        const messages = PromptArchitect.assemble(
            systemPrompt,
            contextPrompt,
            taskPrompt,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: GeneratedQuestionSchema,
            provider: "mimo",
            temperature: 0.1,
            onLog: (msg, details) => this.log(context, msg, details),
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

        return { success: false, error: "Follow-up generation failed" };
    }
}
