/**
 * Quiz Factory (AI Production Layer)
 *
 * Unified pipeline for generating Questions, Follow-ups, and Archive Refresh items.
 * Consolidates GeneratorService, GenerationPipeline, PromptArchitect, and all Task Logic.
 */

import * as Repository from "../api/repository";
import { subjectKnowledgeService } from "@/shared/services/knowledge/subject-knowledge.service";
import type { ConceptMapItem } from "./types";

import {
    type GenerationLog,
    type GenerationStep,
    type GeneratorCallbacks,
} from "./schemas";
export type { GenerationLog, GenerationStep, GeneratorCallbacks };

import { PromptArchitect } from "./utils";

// --- Tasks imported from ./tasks ---
import { AnalysisTask } from "./tasks/analysis-task";
import { DraftingTask } from "./tasks/drafting-task";
import { ValidationTask } from "./tasks/validation-task";
import { RevisionTask } from "./tasks/revision-task";
import { FollowUpTask, WrongAnswerContext } from "./tasks/follow-up-task";

// --- Main Factory Class ---

export class QuizFactory {
    private analysisTask = new AnalysisTask();
    private draftingTask = new DraftingTask();
    private validationTask = new ValidationTask();
    private revisionTask = new RevisionTask();
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
     */
    async generateForChunk(
        chunkId: string,
        callbacks: GeneratorCallbacks,
        options: {
            targetCount?: number;
            usageType?: "antrenman" | "arsiv" | "deneme";
            force?: boolean;
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
            log("INIT", "Chunk bilgileri yükleniyor...", { chunkId });

            await Repository.updateChunkStatus(chunkId, "PROCESSING");

            const chunk = await Repository.getChunkWithContent(chunkId);
            if (!chunk) throw new Error("Chunk not found");

            // 2. MAPPING
            log("MAPPING", "Kavram haritası çıkarılıyor...");
            let concepts: ConceptMapItem[] = (chunk.metadata as {
                concept_map?: ConceptMapItem[];
                difficulty_index?: number;
                density_score?: number;
            })?.concept_map || [];
            let difficultyIndex = (chunk.metadata as {
                concept_map?: ConceptMapItem[];
                difficulty_index?: number;
                density_score?: number;
            })?.difficulty_index || (chunk.metadata as any)?.density_score || 3;

            if (concepts.length === 0) {
                const analysisResult = await this.analysisTask.run({
                    content: chunk.display_content || chunk.content,
                    courseName: chunk.course_name,
                    sectionTitle: chunk.section_title,
                }, {
                    logger: (msg: string, d?: Record<string, unknown>) =>
                        log("MAPPING", msg, d || {}),
                });

                if (!analysisResult.success || !analysisResult.data) {
                    throw new Error("Concept mapping failed");
                }

                concepts = analysisResult.data.concepts;
                difficultyIndex = analysisResult.data.difficulty_index;

                const { error: updateErr } = await Repository
                    .updateChunkMetadata(chunkId, {
                        ...(chunk.metadata as Record<string, unknown>),
                        concept_map: concepts,
                        difficulty_index: difficultyIndex,
                    } as any);

                // Hata yönetimi: kayıt başarısız olursa sessiz kalma, hata fırlat
                if (updateErr) {
                    console.error("[Factory] Mapping save failed:", updateErr);
                    throw new Error(
                        `Kavram haritası kaydedilemedi: ${updateErr.message}`,
                    );
                }

                log("MAPPING", "Kavram haritası başarıyla kaydedildi.");
            }

            // 3. GENERATION LOOP
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

            // Determine quota and target
            const usageType = options.usageType || "antrenman";
            const targetConcepts = (usageType === "antrenman")
                ? concepts
                : [...concepts].sort(() => 0.5 - Math.random());

            let generatedCount = 0;
            const targetTotal = options.targetCount || concepts.length;

            log("GENERATING", `Üretim başlıyor: ${usageType.toUpperCase()}`, {
                target: targetTotal,
            });

            for (let i = 0; i < targetConcepts.length; i++) {
                if (generatedCount >= targetTotal) break;

                const concept = targetConcepts[i];
                log("GENERATING", `Kavram işleniyor: ${concept.baslik}`, {
                    index: i + 1,
                });

                // Check Cache
                const cached = await Repository.fetchCachedQuestion(
                    chunkId,
                    usageType,
                    concept.baslik,
                );

                if (cached) {
                    log("SAVING", "Cache'den getirildi", {
                        concept: concept.baslik,
                    });
                    callbacks.onQuestionSaved(++generatedCount);
                    continue;
                }

                // Draft
                const draft = await this.draftingTask.run({
                    concept,
                    index: i,
                    courseName: chunk.course_name,
                    usageType,
                    sharedContextPrompt: sharedContext,
                }, {
                    logger: (msg: string, d?: Record<string, unknown>) =>
                        log("GENERATING", msg, d || {}),
                });

                if (!draft.success || !draft.data) continue;

                let question = draft.data;

                // Validate & Revise
                let validRes = await this.validationTask.run({
                    question,
                    content: cleanContent,
                }, {
                    logger: (msg: string, d?: Record<string, unknown>) =>
                        log("VALIDATING", msg, d || {}),
                });
                let attempts = 0;

                while (
                    validRes.success &&
                    validRes.data?.decision === "REJECTED" && attempts < 2
                ) {
                    attempts++;
                    log("VALIDATING", `Revizyon deneniyor (${attempts})...`);
                    const revRes = await this.revisionTask.run({
                        originalQuestion: question,
                        validationResult: validRes.data,
                        sharedContextPrompt: sharedContext,
                    }, {
                        logger: (msg: string, d?: Record<string, unknown>) =>
                            log(
                                "VALIDATING",
                                msg,
                                d || {},
                            ),
                    });

                    if (!revRes.success || !revRes.data) break;
                    question = revRes.data;
                    validRes = await this.validationTask.run({
                        question,
                        content: cleanContent,
                    }, {
                        logger: (msg: string, d?: Record<string, unknown>) =>
                            log(
                                "VALIDATING",
                                msg,
                                d || {},
                            ),
                    });
                }

                if (
                    validRes.success && validRes.data?.decision === "APPROVED"
                ) {
                    // Save
                    const { error: saveErr } = await Repository.createQuestion({
                        chunk_id: chunkId,
                        course_id: chunk.course_id,
                        section_title: chunk.section_title,
                        usage_type: usageType,
                        bloom_level: question.bloomLevel || "knowledge",
                        question_data: {
                            q: question.q,
                            o: question.o,
                            a: question.a,
                            exp: question.exp,
                            img: question.img,
                            evidence: question.evidence,
                            diagnosis: question.diagnosis,
                            insight: question.insight,
                        },
                        concept_title: concept.baslik,
                    });

                    if (!saveErr) {
                        callbacks.onQuestionSaved(++generatedCount);
                        log("SAVING", "Soru kaydedildi", {
                            concept: concept.baslik,
                        });
                    } else {
                        log("ERROR", "Kayıt hatası", {
                            error: saveErr.message,
                        });
                    }
                } else {
                    log("ERROR", "Soru onaylanmadı", {
                        concept: concept.baslik,
                    });
                }
            }

            await Repository.updateChunkStatus(chunkId, "COMPLETED");
            callbacks.onComplete({ success: true, generated: generatedCount });
            log("COMPLETED", "İşlem tamamlandı", { total: generatedCount });
        } catch (e: unknown) {
            const errorMessage = e instanceof Error
                ? e.message
                : "Bilinmeyen hata";
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
            console.error("FollowUp Gen Error:", e);
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
            console.error("Archive Refresh Error:", e);
            return null;
        }
    }
}
