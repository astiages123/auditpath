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

import { toast } from "sonner";
import { supabase } from "@/shared/lib/core/supabase";
import type { Json } from "@/shared/types/supabase";
import { AnalysisTask, type ConceptMapItem } from "./ai-engine/tasks/analysis";
import { GenerationPipeline } from "./ai-engine/pipelines/generation-pipeline";
import { FollowUpTask } from "./ai-engine/tasks/followup";
import { subjectKnowledgeService } from "@/shared/services/knowledge/subject-knowledge.service";
import { calculateDynamicQuota } from "@/shared/lib/core/quota";
import { PromptArchitect } from "./ai-engine/core/prompt/prompt-architect";

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
  metadata: {
    concept_map?: ConceptMapItem[];
    density_score?: number;
    meaningful_word_count?: number;
  } | null;
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
        | {
          concept_map?: ConceptMapItem[];
          density_score?: number;
          meaningful_word_count?: number;
        }
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
      const analysisTask = new AnalysisTask();
      const analysisResult = await analysisTask.run(
        {
          content: chunkData.content,
          wordCount: chunkData.word_count || 500,
          meaningfulWordCount: chunkData.metadata?.meaningful_word_count,
          densityScore: chunkData.metadata?.density_score, // If re-running analysis?
          courseName: chunkData.course_name,
          sectionTitle: chunkData.section_title,
        },
        {
          logger: (msg: string, details?: Record<string, unknown>) =>
            log("MAPPING", msg, details || {}),
        },
      );

      if (!analysisResult.success || !analysisResult.data) {
        const errorMsg =
          "Kavram haritası oluşturulamadı (AI Modeli yanıtı boş veya eksik). Lütfen tekrar deneyin.";
        log("ERROR", "Kavram haritası oluşturulamadı", {});
        await supabase.from("note_chunks").update({
          status: "FAILED",
        }).eq("id", chunkId);
        toast.error(errorMsg);
        onError(errorMsg);
        return {
          success: false,
          generated: 0,
          quota: 0,
          error: "Concept mapping failed",
        };
      }

      concepts = analysisResult.data.concepts;
      const densityScore = analysisResult.data.density_score;

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

      // Update local chunkData metadata for next steps
      chunkData.metadata = newMetadata as unknown as {
        concept_map?: ConceptMapItem[];
        density_score?: number;
      };

      log("MAPPING", `Kavram haritası oluşturuldu`, {
        conceptCount: concepts.length,
        densityScore,
        concepts: concepts.map((c) => c.baslik),
      });
    }

    // === STEP 3: QUOTA (MASTER SET SEALING) ===
    // Update target_count immediately to match concept count
    await supabase.from("note_chunks").update({
      target_count: concepts.length,
    }).eq("id", chunkId);

    // Section Count Calculation (Legacy? We use density score now)
    // const sectionCount = (chunkData.content.match(/^##\s/gm) || []).length || 1;

    // Get Density Score from metadata or default
    const densityScore = chunkData.metadata?.density_score || 1;

    // Use meaningful_word_count if available, otherwise fallback to word_count
    const baseWordCount = chunkData.metadata?.meaningful_word_count ||
      chunkData.word_count || 500;

    // --- MASTER SET SEALING LOGIC ---
    // Antrenman (Master Set) Quota = Concepts.length (Strict 1:1)
    const antrenmanQuota = concepts.length;

    // Archive & Trial Quotas are percentage-based derived from Master Set
    const arsivQuota = Math.ceil(antrenmanQuota * 0.25);
    const denemeQuota = Math.ceil(antrenmanQuota * 0.25);

    const quota = {
      baseCount: baseWordCount, // for logging purposes
      multiplier: 1.0, // for logging purposes
      total: antrenmanQuota + arsivQuota + denemeQuota,
      antrenman: antrenmanQuota,
      arsiv: arsivQuota,
      deneme: denemeQuota,
    };
    const remaining = quota.antrenman - (existingCount || 0);

    log("QUOTA", "Kota hesaplandı", {
      wordCount: chunkData.word_count,
      densityScore,
      conceptCount: concepts.length,
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
        phaseConcepts = [...concepts];
      } else {
        // For Random (Archive/Deneme), we want RANDOM selection from the map to reinforce diverse topics.
        const shuffled = [...concepts].sort(() => 0.5 - Math.random());
        phaseConcepts = shuffled;
      }

      let phaseGenerated = 0;
      let conceptCursor = 0;

      // Retry Queue for this Phase
      const phaseRetryQueue: ConceptMapItem[] = [];

      while (phaseGenerated < remainingForPhase) {
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

        if (consecutiveBatchFailures >= 3 && !isFallbackActive) {
          isFallbackActive = true;
          log(
            "GENERATING",
            ">>> SAFE MODE ACTIVATED: Multiple failures detected. Switching to Fallback Model. <<<",
          );
        }

        // Generate with immediate save callback
        const pipeline = new GenerationPipeline({
          onLog: (msg, details) =>
            log("GENERATING", msg, details as Record<string, unknown>),
          onQuestionApproved: async (question, _index) => {
            if (phaseGenerated >= remainingForPhase) return;

            const insertPayload = {
              chunk_id: chunkId,
              course_id: chunkData.course_id,
              section_title: chunkData.section_title,
              usage_type: phase.type,
              bloom_level: question.bloomLevel || "knowledge",
              question_data: {
                q: question.q,
                o: question.o,
                a: question.a,
                exp: question.exp,
                img: question.img || null,
              },
              concept_title: question.concept,
            };

            console.log("[SAVING] 💾 Anında kayıt:", question.concept);

            const { data: insertData, error: insertError, status } =
              await supabase
                .from("questions")
                .insert(insertPayload)
                .select();

            if (!insertError && insertData && insertData.length > 0) {
              phaseGenerated++;
              totalGenerated++;
              onQuestionSaved(totalGenerated);
              log("SAVING", `[${phase.type}] ✅ Soru kaydedildi`, {
                id: totalGenerated,
                concept: question.concept,
                dbId: insertData[0]?.id,
              });
              consecutiveBatchFailures = 0;
            } else {
              console.error("[SAVING] ❌ Kayıt hatası:", insertError);
              log("ERROR", "Kaydetme hatası", {
                error: insertError?.message || "Unknown",
                status,
              });
            }
          },
        });

        const generated = await pipeline.runWithConcepts(
          chunkData.content,
          chunkData.course_name,
          chunkData.section_title,
          chunkData.word_count || 500,
          batchConcepts,
          conceptCursor,
          phase.type,
          guidelines,
          densityScore,
        );

        if (generated.length === 0) {
          consecutiveBatchFailures++;
          log(
            "ERROR",
            `[${phase.type}] Batch üretilemedi, kuyruğa ekleniyor (Failure #${consecutiveBatchFailures})`,
          );
          phaseRetryQueue.push(...batchConcepts);
          // Safety break to prevent infinite loops if everything fails
          if (consecutiveBatchFailures > 5) {
            break;
          }
          continue;
        }

        // Questions are saved in the callback
      } // end phase while

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
  context: import("./ai-engine/tasks/followup").WrongAnswerContext,
  onLog: (msg: string, details?: unknown) => void,
): Promise<string | null> {
  try {
    // Chunk metadata için sadece course_name ve section_title çek
    const { data: targetChunk, error: chunkError } = await supabase
      .from("note_chunks")
      .select("course_id, course_name, section_title, content, display_content")
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

    const task = new FollowUpTask();
    const cleanContent = PromptArchitect.cleanReferenceImages(
      targetChunk.display_content || targetChunk.content,
    );

    const result = await task.run({
      context,
      evidence,
      chunkContent: cleanContent,
      courseName: targetChunk.course_name,
      sectionTitle: targetChunk.section_title,
      guidelines,
    }, { logger: (msg: string, details?: any) => onLog(msg, details) });

    if (!result.success || !result.data) {
      onLog("HATA: Follow-up soru üretilemedi", { error: result.error });
      return null;
    }

    const question = result.data;

    // Save to DB
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
          evidence: question.evidence || null,
          diagnosis: question.diagnosis || null,
          insight: question.insight || null,
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
