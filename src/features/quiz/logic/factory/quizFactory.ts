import { type Json } from "@/types/database.types";
import * as Repository from "@/features/quiz/services/repositories/quizRepository";
import { subjectKnowledgeService } from "@/features/quiz/services/core/subjectKnowledgeService";
import { logger } from "@/utils/logger";
import { getSubjectStrategy } from "@/features/quiz/logic/algorithms/strategy";
import { type ConceptMapItem } from "@/features/quiz/types";
import { isValid, parseOrThrow } from "@/utils/helpers";
import { ChunkMetadataSchema } from "@/features/quiz/types";

import {
    type GenerationLog,
    type GenerationStep,
    type GeneratorCallbacks,
} from "@/features/quiz/types";

import { PromptArchitect } from "@/features/quiz/logic/utils";

// --- Tasks and Modules ---
import { AnalysisTask } from "@/features/quiz/logic/tasks/AnalysisTask";
import { DraftingTask } from "@/features/quiz/logic/tasks/DraftingTask";
import {
    FollowUpTask,
    type WrongAnswerContext,
} from "@/features/quiz/logic/tasks/FollowUpTask";

import { calculateQuotas, updateChunkQuotas } from "./quotaLogic";
import { GenerationPipeline } from "./generationPipeline";

export type { GenerationLog, GenerationStep, GeneratorCallbacks };

export class QuizFactory {
    private analysisTask = new AnalysisTask();
    private draftingTask = new DraftingTask();
    private followUpTask = new FollowUpTask();

    private createLog(
        step: GenerationStep,
        message: string,
        details: Record<string, unknown> = {},
    ): GenerationLog {
        return {
            id: crypto.randomUUID(),
            step,
            message,
            details,
            timestamp: new Date(),
        };
    }

    /**
     * Unified generation pipeline for Chunk-based questions
     * Optimized for "Pre-Generation & Pooling" model.
     */
    async generateForChunk(
        chunkId: string,
        callbacks: GeneratorCallbacks,
        options: {
            targetCount?: number;
            usageType?: "antrenman" | "arsiv" | "deneme";
            force?: boolean;
            mappingOnly?: boolean;
            userId?: string;
        } = {},
    ) {
        const log = (
            step: GenerationStep,
            msg: string,
            details: Record<string, unknown> = {},
        ) => {
            callbacks.onLog(this.createLog(step, msg, details));
        };

        try {
            // 1. INIT
            log("INIT", "Ders materyalleri kütüphaneden alınıyor...", {
                chunkId,
            });

            await Repository.updateChunkStatus(chunkId, "PROCESSING");

            const chunk = await Repository.getChunkWithContent(chunkId);
            if (!chunk) throw new Error("Chunk not found");

            // 2. MAPPING
            log(
                "MAPPING",
                "Konunun kritik noktaları ve can damarları belirleniyor...",
            );
            const metadata = isValid(ChunkMetadataSchema, chunk.metadata)
                ? parseOrThrow(ChunkMetadataSchema, chunk.metadata)
                : {};
            let concepts: ConceptMapItem[] =
                (metadata.concept_map as ConceptMapItem[]) || [];
            let difficultyIndex = metadata.difficulty_index || 3;

            // Strategy for importance
            const strategy = getSubjectStrategy(chunk.course_name);
            const importance = strategy?.importance || "medium";

            if (concepts.length === 0) {
                const analysisResult = await this.analysisTask.run(
                    {
                        content: chunk.display_content || chunk.content,
                        courseName: chunk.course_name,
                        sectionTitle: chunk.section_title,
                        importance,
                    },
                    {
                        logger: (msg: string, d?: Record<string, unknown>) =>
                            log("MAPPING", msg, d || {}),
                    },
                );

                if (!analysisResult.success || !analysisResult.data) {
                    throw new Error(
                        "Sistem şu an çok yoğun, lütfen biraz sonra tekrar deneyin.",
                    );
                }

                concepts = analysisResult.data.concepts;
                difficultyIndex = analysisResult.data.difficulty_index;

                const { error: updateErr } = await Repository
                    .updateChunkMetadata(
                        chunkId,
                        {
                            ...((chunk.metadata || {}) as Record<
                                string,
                                unknown
                            >),
                            concept_map: concepts as Json[],
                            difficulty_index: difficultyIndex,
                        },
                    );

                if (updateErr) {
                    logger.error("[Factory] Mapping save failed:", updateErr);
                    throw new Error(
                        `Öğrenme haritası oluşturulurken küçük bir pürüz çıktı, tekrar deniyoruz: ${updateErr.message}`,
                    );
                }

                log(
                    "MAPPING",
                    "Harika! Öğrenme yol haritanız başarıyla oluşturuldu.",
                    {
                        conceptCount: concepts.length,
                    },
                );
            }

            const quotas = calculateQuotas(concepts);
            await updateChunkQuotas(chunkId, quotas);

            // Report total target for progress tracking
            const totalTarget = quotas.antrenman + quotas.deneme + quotas.arsiv;
            callbacks.onTotalTargetCalculated(totalTarget);

            if (options.mappingOnly) {
                await Repository.updateChunkStatus(chunkId, "COMPLETED");
                callbacks.onComplete({ success: true, generated: 0 });
                log(
                    "COMPLETED",
                    "Konu analizi bitti, senin için en uygun sorular seçiliyor...",
                    {
                        concepts: concepts.length,
                    },
                );
                return;
            }

            // 3. GENERATION PIPELINE
            const guidelines = await subjectKnowledgeService.getGuidelines(
                chunk.course_name,
            );
            const cleanContent = PromptArchitect.cleanReferenceImages(
                chunk.display_content || chunk.content,
            );
            const sharedContext = PromptArchitect.buildContext(
                cleanContent,
                chunk.course_name,
                chunk.section_title,
                guidelines,
            );

            const pipeline = new GenerationPipeline(log, callbacks);
            const totalGeneratedCount = await pipeline.run(
                chunk,
                concepts,
                quotas,
                sharedContext,
                cleanContent,
                options,
            );

            await Repository.updateChunkStatus(chunkId, "COMPLETED");
            callbacks.onComplete({
                success: true,
                generated: totalGeneratedCount,
            });
            log("COMPLETED", "Yeni öğrenme serüveniniz başarıyla hazırlandı!", {
                total: totalGeneratedCount,
            });
        } catch (e: unknown) {
            const errorMessage = e instanceof Error
                ? e.message
                : "Beklenmedik bir aksaklık oluştu, hemen ilgileniyoruz.";
            log("ERROR", errorMessage);
            callbacks.onError(errorMessage);
            await Repository.updateChunkStatus(chunkId, "FAILED");
        }
    }

    /**
     * Generate Follow-Up Question
     */
    async generateFollowUp(
        context: WrongAnswerContext,
    ): Promise<string | null> {
        try {
            const chunk = await Repository.getChunkWithContent(context.chunkId);

            if (!chunk) return null;

            const guidelines = await subjectKnowledgeService.getGuidelines(
                chunk.course_name,
            );
            const cleanContent = PromptArchitect.cleanReferenceImages(
                chunk.display_content || chunk.content,
            );

            const result = await this.followUpTask.run({
                context,
                evidence: context.originalQuestion.evidence || "",
                chunkContent: cleanContent,
                courseName: chunk.course_name,
                sectionTitle: chunk.section_title,
                guidelines: guidelines
                    ? {
                        instruction: guidelines.instruction,
                        few_shot_example: guidelines.few_shot_example,
                    }
                    : {},
            });

            if (!result.success || !result.data) return null;

            const q = result.data;
            const { error: saveErr } = await Repository.createQuestion({
                chunk_id: context.chunkId,
                course_id: context.courseId,
                section_title: chunk.section_title,
                usage_type: "antrenman",
                bloom_level: q.bloomLevel,
                created_by: context.userId,
                parent_question_id: context.originalQuestion.id,
                question_data: {
                    q: q.q,
                    o: q.o,
                    a: q.a,
                    exp: q.exp,
                    img: q.img,
                    evidence: q.evidence,
                    diagnosis: q.diagnosis,
                    insight: q.insight,
                },
            });

            if (saveErr) return null;
            const saved = await Repository.fetchGeneratedQuestions(
                context.chunkId,
                "antrenman",
                1,
            );
            return saved?.[0]?.id || null;
        } catch (e) {
            logger.error("FollowUp Gen Error:", e as Error);
            return null;
        }
    }

    /**
     * Generate Archive Refresh Question (Anti-Ezber)
     */
    async generateArchiveRefresh(
        chunkId: string,
        originalQuestionId: string,
    ): Promise<string | null> {
        try {
            const originalQ = await Repository.getQuestionData(
                originalQuestionId,
            );
            if (!originalQ?.concept_title) return null;

            const chunk = await Repository.getChunkWithContent(chunkId);
            if (!chunk) return null;

            const guidelines = await subjectKnowledgeService.getGuidelines(
                chunk.course_name,
            );
            const cleanContent = PromptArchitect.cleanReferenceImages(
                chunk.display_content || chunk.content,
            );
            const sharedContext = PromptArchitect.buildContext(
                cleanContent,
                chunk.course_name,
                chunk.section_title,
                guidelines,
            );

            const concept: ConceptMapItem = {
                baslik: originalQ.concept_title,
                odak: "Kavram pekiştirme ve tazeleme",
                seviye: "Bilgi",
                gorsel: null,
            };

            const draft = await this.draftingTask.run({
                concept,
                index: 0,
                courseName: chunk.course_name,
                usageType: "arsiv",
                sharedContextPrompt: sharedContext,
            });

            if (!draft.success || !draft.data) return null;

            const q = draft.data;
            const { error: saveErr } = await Repository.createQuestion({
                chunk_id: chunkId,
                course_id: chunk.course_id,
                section_title: chunk.section_title,
                usage_type: "arsiv",
                bloom_level: q.bloomLevel || "knowledge",
                question_data: {
                    q: q.q,
                    o: q.o,
                    a: q.a,
                    exp: q.exp,
                    img: q.img,
                    evidence: q.evidence,
                    diagnosis: q.diagnosis,
                    insight: q.insight,
                },
                concept_title: concept.baslik,
            });

            if (saveErr) return null;

            const saved = await Repository.fetchGeneratedQuestions(
                chunkId,
                "arsiv",
                1,
            );
            return saved?.[0]?.id || null;
        } catch (e) {
            logger.error("Archive Refresh Error:", e as Error);
            return null;
        }
    }
}
