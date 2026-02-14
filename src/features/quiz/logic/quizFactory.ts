/**
 * Quiz Factory (AI Production Layer)
 *
 * Unified pipeline for generating Questions, Follow-ups, and Archive Refresh items.
 * Consolidates GeneratorService, GenerationPipeline, PromptArchitect, and all Task Logic.
 */

import * as Repository from "@/features/quiz/services/quizRepository";
import { type Json } from "@/types/database.types";
import { subjectKnowledgeService } from "@/features/quiz/services";
import { logger } from "@/utils/logger";
import { getSubjectStrategy } from "@/features/quiz/logic";
import { type ConceptMapItem } from "@/features/quiz/types";
import { isValid, parseOrThrow } from "@/utils/helpers";
import { ChunkMetadataSchema } from "@/features/quiz/types";

import {
  type GenerationLog,
  type GenerationStep,
  type GeneratorCallbacks,
} from "../types/quizEngineSchemas";
export type { GenerationLog, GenerationStep, GeneratorCallbacks };

import { PromptArchitect } from "./quizUtils";

// --- Tasks imported from consolidated quiz-tasks ---
import {
  AnalysisTask,
  DraftingTask,
  FollowUpTask,
  RevisionTask,
  ValidationTask,
  WrongAnswerContext,
} from "./quizTasks";

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
  /**
   * Unified generation pipeline for Chunk-based questions
   * Optimized for "Pre-Generation & Pooling" model.
   */
  async generateForChunk(
    chunkId: string,
    callbacks: GeneratorCallbacks,
    options: {
      targetCount?: number;
      usageType?: "antrenman" | "arsiv" | "deneme"; // Still allowed for single-type override if needed
      force?: boolean;
      mappingOnly?: boolean;
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
          throw new Error("Concept mapping failed");
        }

        concepts = analysisResult.data.concepts;
        difficultyIndex = analysisResult.data.difficulty_index;
        const aiQuotas = analysisResult.data.quotas;

        const { error: updateErr } = await Repository.updateChunkAILogic(
          chunkId,
          {
            suggested_quotas: aiQuotas,
          },
        );

        // Also update metadata for backward compatibility
        if (!updateErr) {
          await Repository.updateChunkMetadata(chunkId, {
            ...((chunk.metadata || {}) as Record<string, unknown>),
            concept_map: concepts as Json,
            difficulty_index: difficultyIndex,
          });
        }

        if (updateErr) {
          logger.error("[Factory] Mapping save failed:", updateErr);
          throw new Error(
            `Kavram haritası kaydedilemedi: ${updateErr.message}`,
          );
        }

        log("MAPPING", "Bilişsel analiz ve kotalar başarıyla kaydedildi.", {
          quotas: aiQuotas,
        });

        // Update local chunk data for the rest of the loop
        chunk.ai_logic = {
          suggested_quotas: aiQuotas,
        };
      }

      // If only mapping is requested, we stop here
      if (options.mappingOnly) {
        await Repository.updateChunkStatus(chunkId, "COMPLETED");
        callbacks.onComplete({ success: true, generated: 0 });
        log("COMPLETED", "Analiz tamamlandı, soru üretimi için bekleniyor.", {
          concepts: concepts.length,
        });
        return;
      }

      // 3. GENERATION LOOP (Multi-type Pooling)
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

      // AI Quotas - read from ai_logic column directly
      const aiLogic =
        (chunk.ai_logic as { suggested_quotas?: Record<string, number> }) || {};
      const quotas = aiLogic.suggested_quotas || {
        antrenman: concepts.length,
        arsiv: Math.ceil(concepts.length * 0.25),
        deneme: Math.ceil(concepts.length * 0.25),
      };

      // Usage types to process
      const usageTypes: ("antrenman" | "deneme" | "arsiv")[] = options.usageType
        ? [options.usageType]
        : ["antrenman", "deneme", "arsiv"];

      let totalGeneratedCount = 0;

      for (const currentUsageType of usageTypes) {
        let targetConcepts = concepts;
        let targetTotal = quotas[currentUsageType] || concepts.length;

        // If specific usage type, pick a random subset based on quota
        if (currentUsageType !== "antrenman") {
          targetConcepts = [...concepts]
            .sort(() => 0.5 - Math.random())
            .slice(0, targetTotal);
        }

        if (options.usageType && options.targetCount) {
          targetTotal = options.targetCount;
        }

        log(
          "GENERATING",
          `Havuz üretimi başlıyor: ${currentUsageType.toUpperCase()}`,
          { target: targetTotal },
        );

        let typeGeneratedCount = 0;

        for (let i = 0; i < targetConcepts.length; i++) {
          if (typeGeneratedCount >= targetTotal) break;

          const concept = targetConcepts[i];
          log(
            "GENERATING",
            `[${currentUsageType}] Kavram işleniyor: ${concept.baslik}`,
            {
              index: i + 1,
            },
          );

          // Check Cache
          const cached = await Repository.fetchCachedQuestion(
            chunkId,
            currentUsageType,
            concept.baslik,
          );

          if (cached) {
            log("SAVING", "Pool'da zaten var, atlanıyor.", {
              concept: concept.baslik,
              type: currentUsageType,
            });
            typeGeneratedCount++;
            totalGeneratedCount++;
            callbacks.onQuestionSaved(totalGeneratedCount);
            continue;
          }

          // Draft
          const draft = await this.draftingTask.run(
            {
              concept,
              index: i,
              courseName: chunk.course_name,
              usageType: currentUsageType,
              sharedContextPrompt: sharedContext,
            },
            {
              logger: (msg: string, d?: Record<string, unknown>) =>
                log("GENERATING", msg, d || {}),
            },
          );

          if (!draft.success || !draft.data) continue;

          let question = draft.data;

          // Validate & Revise
          let validRes = await this.validationTask.run(
            {
              question,
              content: cleanContent,
            },
            {
              logger: (msg: string, d?: Record<string, unknown>) =>
                log("VALIDATING", msg, d || {}),
            },
          );
          let attempts = 0;

          while (
            validRes.success &&
            validRes.data?.decision === "REJECTED" &&
            attempts < 2
          ) {
            attempts++;
            log("VALIDATING", `Revizyon deneniyor (${attempts})...`);
            const revRes = await this.revisionTask.run(
              {
                originalQuestion: question,
                validationResult: validRes.data,
                sharedContextPrompt: sharedContext,
              },
              {
                logger: (msg: string, d?: Record<string, unknown>) =>
                  log("VALIDATING", msg, d || {}),
              },
            );

            if (!revRes.success || !revRes.data) break;
            question = revRes.data;
            validRes = await this.validationTask.run(
              {
                question,
                content: cleanContent,
              },
              {
                logger: (msg: string, d?: Record<string, unknown>) =>
                  log("VALIDATING", msg, d || {}),
              },
            );
          }

          if (validRes.success && validRes.data?.decision === "APPROVED") {
            // Save
            const { error: saveErr } = await Repository.createQuestion({
              chunk_id: chunkId,
              course_id: chunk.course_id,
              section_title: chunk.section_title,
              usage_type: currentUsageType,
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
              typeGeneratedCount++;
              totalGeneratedCount++;
              callbacks.onQuestionSaved(totalGeneratedCount);
              log("SAVING", "Soru havuza kaydedildi", {
                concept: concept.baslik,
                type: currentUsageType,
              });
            } else {
              log("ERROR", "Kayıt hatası", {
                error: saveErr.message,
              });
            }
          } else {
            log(
              "ERROR",
              `Kalite standartları karşılanamadığı için [${concept.baslik}] atlandı`,
              {
                concept: concept.baslik,
              },
            );
          }
        }
      }

      await Repository.updateChunkStatus(chunkId, "COMPLETED");
      callbacks.onComplete({ success: true, generated: totalGeneratedCount });
      log("COMPLETED", "İşlem tamamlandı", { total: totalGeneratedCount });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Bilinmeyen hata";
      log("ERROR", errorMessage);
      callbacks.onError(errorMessage);
      await Repository.updateChunkStatus(chunkId, "FAILED");
    }
  }

  /**
   * Generate Follow-Up Question
   */
  async generateFollowUp(context: WrongAnswerContext): Promise<string | null> {
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
      const originalQ = await Repository.getQuestionData(originalQuestionId);
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
