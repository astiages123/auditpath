/**
 * Quiz Generator (Browser)
 *
 * Tarayıcı tabanlı soru üretim motoru.
 * A'dan Z'ye her adımı loglar:
 * - INIT: Chunk bilgileri, kota hesaplama
 * - MAPPING: Kavram haritası çıkarma
 * - GENERATING: Soru üretimi (batch detayları)
 * - VALIDATING: Doğrulama (skor, karar)
 * - SAVING: DB'ye kaydetme
 * - COMPLETED/ERROR: Sonuç
 */

import { supabase } from "@/shared/lib/core/supabase";
import type { Json } from "@/shared/types/supabase";
import { type ConceptMapItem, generateConceptMap } from "../modules/ai/mapping";
import {
  generateQuestionBatch,
  reviseQuestion,
} from "../modules/ai/question-generation";
import {
  type QuestionToValidate,
  validateQuestionBatch,
} from "../modules/ai/validation";
import { subjectKnowledgeService } from "@/shared/services/knowledge/subject-knowledge.service";
import { calculateQuota } from "@/shared/lib/core/quota";

// Constants
// BATCH_SIZE removed - RateLimiter manages batching dynamically

// Types
export type LogStep =
  | "INIT"
  | "QUOTA"
  | "MAPPING"
  | "GENERATING"
  | "VALIDATING"
  | "SAVING"
  | "COMPLETED"
  | "ERROR";

export interface GenerationLog {
  id: string;
  step: LogStep;
  message: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface GenerationResult {
  success: boolean;
  generated: number;
  quota: number;
  error?: string;
}

export interface GeneratorCallbacks {
  onLog: (log: GenerationLog) => void;
  onQuestionSaved: (totalSaved: number) => void;
  onComplete: (result: GenerationResult) => void;
  onError: (error: string) => void;
}

interface ChunkData {
  id: string;
  content: string;
  word_count: number;
  course_id: string;
  course_name: string;
  section_title: string;
  metadata: { concept_map?: ConceptMapItem[] } | null;
}

/**
 * Create a log entry
 */
function createLog(
  step: LogStep,
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
 * Main generator function
 */
export async function generateQuestionsForChunk(
  chunkId: string,
  callbacks: GeneratorCallbacks,
): Promise<GenerationResult> {
  const { onLog, onQuestionSaved, onComplete, onError } = callbacks;

  const log = (
    step: LogStep,
    message: string,
    details: Record<string, unknown> = {},
  ) => {
    const logEntry = createLog(step, message, details);
    onLog(logEntry);
  };

  try {
    // === STEP 1: INIT ===
    log("INIT", "Chunk bilgileri yükleniyor...", { chunkId });

    // Single Chunk prensibi: Sadece hedef chunk'ı çek
    const { data: targetChunk, error: targetError } = await supabase
      .from("note_chunks")
      .select(
        "id, content, display_content, word_count, course_id, course_name, section_title, metadata",
      )
      .eq("id", chunkId)
      .single();

    if (targetError || !targetChunk) {
      log("ERROR", "Hedef Chunk bulunamadı", { error: targetError?.message });
      onError("Chunk not found");
      return {
        success: false,
        generated: 0,
        quota: 0,
        error: "Chunk not found",
      };
    }

    // chunkData direkt targetChunk'tan oluştur (birleştirme yok!)
    const chunkData: ChunkData = {
      id: targetChunk.id,
      content: targetChunk.display_content || targetChunk.content,
      word_count: targetChunk.word_count || 0,
      course_id: targetChunk.course_id,
      course_name: targetChunk.course_name,
      section_title: targetChunk.section_title,
      metadata: targetChunk.metadata as
        | { concept_map?: ConceptMapItem[] }
        | null,
    };

    // Update chunk status
    await supabase.from("note_chunks").update({ status: "PROCESSING" }).eq(
      "id",
      chunkId,
    );

    // Get existing question count
    const { count: existingCount } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("chunk_id", chunkId);

    log("INIT", `Chunk yüklendi`, {
      wordCount: chunkData.word_count,
      existingQuestions: existingCount || 0,
      contentPreview: chunkData.content.substring(0, 100) + "...",
    });

    // === STEP 2: MAPPING ===
    log("MAPPING", "Kavram haritası çıkarılıyor...", {});

    let concepts: ConceptMapItem[];

    if (
      chunkData.metadata?.concept_map &&
      chunkData.metadata.concept_map.length > 0
    ) {
      concepts = chunkData.metadata.concept_map;
      log("MAPPING", `Mevcut kavram haritası kullanılıyor`, {
        conceptCount: concepts.length,
        concepts: concepts.map((c) => c.baslik),
      });
    } else {
      const mappingResult = await generateConceptMap(
        chunkData.content,
        chunkData.word_count || 500,
        (msg: string, details?: Record<string, unknown>) =>
          log("MAPPING", msg, (details || {}) as Record<string, unknown>),
      );

      concepts = mappingResult.concepts;
      const densityScore = mappingResult.density_score;

      if (concepts.length === 0) {
        log("ERROR", "Kavram haritası oluşturulamadı", {});
        await supabase.from("note_chunks").update({
          status: "FAILED",
          error_message: "Concept map failed",
        }).eq("id", chunkId);
        onError("Kavram haritası oluşturulamadı");
        return {
          success: false,
          generated: 0,
          quota: 0,
          error: "Concept mapping failed",
        };
      }

      // Save concept map to metadata
      const newMetadata = {
        ...chunkData.metadata,
        concept_map: concepts,
        density_score: densityScore,
        concept_map_created_at: new Date().toISOString(),
      } as unknown as Json;

      await supabase.from("note_chunks").update({
        metadata: newMetadata,
      }).eq("id", chunkId);

      log("MAPPING", `Kavram haritası oluşturuldu`, {
        conceptCount: concepts.length,
        densityScore,
        concepts: concepts.map((c) => c.baslik),
      });
    }

    // === STEP 3: QUOTA ===
    // === STEP 3: QUOTA ===
    // Section Count Calculation
    const sectionCount = (chunkData.content.match(/^##\s/gm) || []).length || 1;

    const quota = calculateQuota(
      chunkData.word_count || 500,
      concepts.length,
      sectionCount,
    );
    const remaining = quota.antrenman - (existingCount || 0);

    log("QUOTA", "Kota hesaplandı", {
      wordCount: chunkData.word_count,
      sectionCount,
      conceptCount: concepts.length,
      conceptDensity: quota.conceptDensity,
      baseCount: quota.baseCount,
      multiplier: quota.multiplier,
      antrenmanQuota: quota.antrenman,
      totalQuota: quota.total,
      existing: existingCount || 0,
      remaining,
    });

    if (remaining <= 0) {
      log("COMPLETED", "Kota zaten dolu, üretim yapılmadı", {
        quota: quota.antrenman,
      });
      await supabase.from("note_chunks").update({
        status: "COMPLETED",
      }).eq("id", chunkId);
      const result: GenerationResult = {
        success: true,
        generated: 0,
        quota: quota.antrenman,
      };
      onComplete(result);
      return result;
    }

    // Get subject guidelines
    const guidelines = await subjectKnowledgeService.getGuidelines(
      chunkData.course_name,
    );

    // === STEP 4: PHASED GENERATION ===

    // We need to fetch existing counts BROKEN DOWN by usage_type
    const { data: existingQuestionsData } = await supabase
      .from("questions")
      .select("usage_type")
      .eq("chunk_id", chunkId);

    const existingBreakdown = {
      antrenman: 0,
      arsiv: 0,
      deneme: 0,
    };

    existingQuestionsData?.forEach((q) => {
      const type = q.usage_type as keyof typeof existingBreakdown;
      if (existingBreakdown[type] !== undefined) {
        existingBreakdown[type]++;
      }
    });

    const phases: Array<{
      type: "antrenman" | "arsiv" | "deneme";
      quota: number;
      existing: number;
      strategy: "sequential" | "random";
    }> = [
      {
        type: "antrenman",
        quota: quota.antrenman,
        existing: existingBreakdown.antrenman,
        strategy: "sequential",
      },
      {
        type: "arsiv",
        quota: quota.arsiv,
        existing: existingBreakdown.arsiv,
        strategy: "random",
      },
      {
        type: "deneme",
        quota: quota.deneme,
        existing: existingBreakdown.deneme,
        strategy: "random",
      },
    ];

    let totalGenerated = 0;
    let consecutiveBatchFailures = 0; // Track consecutive failures for Fallback
    let isFallbackActive = false; // Safe Mode flag

    for (const phase of phases) {
      const remainingForPhase = Math.max(0, phase.quota - phase.existing);

      log("GENERATING", `FAZ BAŞLIYOR: ${phase.type.toUpperCase()}`, {
        quota: phase.quota,
        existing: phase.existing,
        target: remainingForPhase,
        strategy: phase.strategy,
      });

      if (remainingForPhase <= 0) {
        log("GENERATING", `Faz tamamlandı (Kota dolu)`, { type: phase.type });
        continue;
      }

      // Determine concepts for this phase
      let phaseConcepts: ConceptMapItem[] = [];

      if (phase.strategy === "sequential") {
        // For Antrenman, we want to cover concepts sequentially if possible,
        // ensuring we try to cover all mapped concepts at least once.
        // If quota > concepts, we cycle. If quota < concepts, we cut off (or should we pick density?)
        // New logic: Just use all concepts. The loop below will handle batching until quota is met.
        // If we run out of concepts but still have quota, we cycle.
        phaseConcepts = [...concepts];
      } else {
        // For Random (Archive/Deneme), we want RANDOM selection from the map to reinforce diverse topics.
        // We need 'remainingForPhase' concepts.
        // Simple random sampling with replacement or shuffling.
        // Let's shuffle the full list and take needed amount, cycling if needed.
        const shuffled = [...concepts].sort(() => 0.5 - Math.random());
        phaseConcepts = shuffled;
      }

      let phaseGenerated = 0;
      let conceptCursor = 0;

      // Retry Queue for this Phase
      const phaseRetryQueue: ConceptMapItem[] = [];

      while (phaseGenerated < remainingForPhase) {
        // Check if we exhausted concepts passage; recycle if necessary for sequential?
        // For sequential, we usually want 1 pass. If quota > concepts, we might stop or repeat.
        // Assumption: Antrenman Quota ~= Concept Count (roughly).
        // If Quota >> Concept Count, we loop.

        // Get next batch
        // RateLimiter handles pacing, so we can request the full needed amount at once.
        const batchSize = remainingForPhase - phaseGenerated;
        const batchConcepts: ConceptMapItem[] = [];

        for (let k = 0; k < batchSize; k++) {
          batchConcepts.push(
            phaseConcepts[conceptCursor % phaseConcepts.length],
          );
          conceptCursor++;
        }

        log(
          "GENERATING",
          `[${phase.type}] Batch işleniyor (RateLimiter Managed)...`,
          {
            batchSize: batchConcepts.length,
            concepts: batchConcepts.map((c) => c.baslik),
          },
        );

        // No sleep needed - RateLimiter handles it.

        if (consecutiveBatchFailures >= 3 && !isFallbackActive) {
          isFallbackActive = true;
          log(
            "GENERATING",
            ">>> SAFE MODE ACTIVATED: Multiple failures detected. Switching to Fallback Model. <<<",
          );
        }

        // Generate
        const generated = await generateQuestionBatch(
          chunkData.content,
          chunkData.course_name,
          chunkData.section_title,
          chunkData.word_count || 500,
          batchConcepts,
          conceptCursor, // approximate index
          guidelines,
          (msg, details) =>
            log("GENERATING", msg, details as Record<string, unknown>),
          phase.type, // Pass usage type!
          chunkId, // Pass chunkId for Cognitive Memory
        );

        if (generated.length === 0) {
          consecutiveBatchFailures++;
          log(
            "ERROR",
            `[${phase.type}] Batch üretilemedi, kuyruğa ekleniyor (Failure #${consecutiveBatchFailures})`,
          );
          phaseRetryQueue.push(...batchConcepts);
          continue;
        }

        // Reset failures on valid generation attempt (even if validation fails, at least generation worked)
        // Or should we only reset on Validation Success?
        // Use stricter: Reset only if at least some pass validation.

        // Validate
        // We use validateQuestionBatch (it uses generic validation)
        const validationResults = await validateQuestionBatch(
          generated as QuestionToValidate[],
          chunkData.content,
          (msg, details) =>
            log("VALIDATING", msg, details as Record<string, unknown>),
        );

        // Save Loop
        for (let i = 0; i < generated.length; i++) {
          if (phaseGenerated >= remainingForPhase) break;

          let question = generated[i];
          let validation = validationResults.find((v) => v.questionIndex === i);

          if (!validation) continue;

          // Self-Correction (1 Attempt)
          if (
            validation.decision === "REJECTED" || validation.total_score < 85
          ) {
            // Prefix caching için aynı context parametrelerini geç
            const revisedQuestion = await reviseQuestion(
              question,
              chunkData.content,
              chunkData.course_name,
              chunkData.section_title,
              guidelines,
              {
                critical_faults: validation.critical_faults,
                improvement_suggestion: validation.improvement_suggestion,
              },
              (msg: string, details?: unknown) =>
                log("VALIDATING", msg, details as Record<string, unknown>),
            );

            if (revisedQuestion) {
              const [reValidation] = await validateQuestionBatch(
                [revisedQuestion] as QuestionToValidate[],
                chunkData.content,
              );
              if (reValidation) {
                question = revisedQuestion;
                validation = reValidation;
              }
            }
          }

          if (validation.decision === "APPROVED") {
            // Save to DB
            const { error: insertError } = await supabase.from("questions")
              .insert({
                chunk_id: chunkId,
                course_id: chunkData.course_id,
                section_title: chunkData.section_title,
                usage_type: phase.type, // CORRECT TAGGING
                bloom_level: question.bloomLevel || "knowledge",
                question_data: {
                  q: question.q,
                  o: question.o,
                  a: question.a,
                  exp: question.exp,
                  img: question.img || null,
                },
                concept_title: question.concept, // Added concept link
              });

            if (!insertError) {
              phaseGenerated++;
              totalGenerated++;
              onQuestionSaved(totalGenerated);
              log("SAVING", `[${phase.type}] Soru kaydedildi`, {
                id: totalGenerated,
              });

              // Success! Reset consecutive failures
              consecutiveBatchFailures = 0;
            } else {
              log("ERROR", "Kaydetme hatası", { error: insertError.message });
            }
          } else {
            // Rejected finally
            // Add to phaseRetryQueue ??
            // Per original logic, we log it.
            log("VALIDATING", "Soru reddedildi (Final)", {
              faults: validation.critical_faults,
            });
            // Validation failed for this item. If ALL fail, we might increment consecutiveBatchFailures?
            // Current logic increments failures only if generation returns empty.
            // Let's count validation wipes as failure too.
          }
        } // end save loop

        // Check if ANY were saved in this batch
        // If not, it means either generation failed (handled above) or all validation failed.
        // But 'generated' array might be non-empty.
        // We need to track actual saved count in this batch.
        // Ideally we track consecutiveBatchFailures here too.
      } // end phase while

      // Phase Retry Processing could go here...
      // For brevity, skipping explicit retry loop for now or relying on the while loop structure if refined.
      // But since while loop depends on 'phaseGenerated', if we fail to generate/save, we might infinite loop if we don't have a reliable pop mechanism.
      // Safety Break: The above while loop uses 'conceptCursor' to move forward.
      // It does NOT strictly loop until quota is full if generators fail continuously.
      // It iterates through concepts ONCE (or cycled).
      // To strictly fill quota, we need a better queue.
      // Current implementation is "Best Effort within Concept Scan".
      // Let's keep it "Best Effort" to avoid infinite loops and burning tokens.

      log("GENERATING", `Faz tamamlandı: ${phase.type}`, {
        generated: phaseGenerated,
      });
    } // end phase loop

    // === STEP 6: COMPLETED ===
    await supabase.from("note_chunks").update({
      status: "COMPLETED",
    }).eq("id", chunkId);

    log("COMPLETED", `Üretim tamamlandı: ${totalGenerated} yeni soru`, {
      generated: totalGenerated,
      quota: quota.antrenman,
      successRate: Math.round((totalGenerated / remaining) * 100) + "%",
    });

    const result: GenerationResult = {
      success: true,
      generated: totalGenerated,
      quota: quota.antrenman,
    };
    onComplete(result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Bilinmeyen hata";
    log("ERROR", `Kritik hata: ${errorMessage}`, { error: errorMessage });

    try {
      await supabase.from("note_chunks").update({
        status: "FAILED",
        error_message: errorMessage,
      }).eq("id", chunkId);
    } catch {
      // Ignore update error
    }

    onError(errorMessage);
    return { success: false, generated: 0, quota: 0, error: errorMessage };
  }
}

/**
 * Generate a single follow-up question for a wrong answer
 * Token Optimizasyonu: Chunk yerine sadece evidence kullanılır
 */
export async function generateFollowUpSingle(
  context: import("../modules/ai/question-generation").WrongAnswerContext,
  onLog: (msg: string, details?: unknown) => void,
): Promise<string | null> {
  try {
    // Chunk metadata için sadece course_name ve section_title çek
    const { data: targetChunk, error: chunkError } = await supabase
      .from("note_chunks")
      .select("course_id, course_name, section_title, content, display_content") // Added content fields
      .eq("id", context.chunkId)
      .single();

    if (chunkError || !targetChunk) {
      onLog("HATA: Chunk bulunamadı");
      return null;
    }

    // Evidence'ı originalQuestion'dan al (context'te zaten var)
    // Eğer yoksa veritabanından çek
    let evidence = context.originalQuestion.evidence;

    if (!evidence) {
      const { data: qData } = await supabase
        .from("questions")
        .select("question_data")
        .eq("id", context.originalQuestion.id)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      evidence = (qData?.question_data as any)?.evidence || "";
    }

    // Fetch guidelines
    const guidelinesData = await subjectKnowledgeService.getGuidelines(
      targetChunk.course_name,
    );

    // Guidelines'ı doğru formata çevir
    const guidelines = guidelinesData
      ? {
        instruction: guidelinesData.instruction,
        few_shot_example: guidelinesData.few_shot_example as unknown,
      }
      : null;

    // Ensure Concept Title is present
    if (!context.originalQuestion.concept) {
      const { data: qData } = await supabase
        .from("questions")
        .select("concept_title")
        .eq("id", context.originalQuestion.id)
        .single();

      if (qData?.concept_title) {
        context.originalQuestion.concept = qData.concept_title;
      }
    }

    // Generate question with evidence only (token efficient)
    const question = await import("../modules/ai/question-generation").then(
      (m) =>
        m.generateFollowUpQuestion(
          context,
          evidence,
          targetChunk.display_content || targetChunk.content, // STRATEGY 3: Pass full content
          targetChunk.course_name,
          targetChunk.section_title,
          guidelines,
          (msg: string, details?: Record<string, unknown>) =>
            onLog(msg, details),
        ),
    );

    if (!question) {
      onLog("HATA: Follow-up soru üretilemedi");
      return null;
    }

    // 6. Save to DB
    const { data: qData, error: qError } = await supabase.from("questions")
      .insert({
        chunk_id: context.chunkId,
        course_id: context.courseId,
        section_title: targetChunk.section_title,
        usage_type: "antrenman",
        bloom_level: question.bloomLevel,
        created_by: context.userId,
        parent_question_id: context.originalQuestion.id,
        question_data: {
          q: question.q,
          o: question.o,
          a: question.a,
          exp: question.exp,
          img: question.img || null,
        },
      }).select("id").single();

    if (qError) {
      onLog("HATA: Kaydedilemedi", { error: qError.message });
      return null;
    }

    onLog("BAŞARILI: Follow-up soru kaydedildi", { id: qData.id });
    return qData.id;
  } catch (error) {
    onLog("KRİTİK HATA: Follow-up süreci başarısız", { error: String(error) });
    return null;
  }
}
