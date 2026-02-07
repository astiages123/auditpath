/**
 * Background Generator
 *
 * Handles background question generation for follow-up questions
 * after quiz completion. Uses Edge Function for actual generation.
 */

import { supabase } from "@/shared/lib/core/supabase";
import {
  generateQuestionsForChunk,
  type GenerationLog,
  type GenerationResult,
} from ".";

/**
 * Trigger background generation for follow-up questions
 * after incorrect answers and refill quota.
 *
 * This is now handled by the quiz-generator Edge Function.
 * This function triggers it asynchronously without blocking the UI.
 */
export async function checkAndTriggerBackgroundGeneration(
  chunkId: string,
  incorrectQuestionIds: string[],
): Promise<void> {
  try {
    // For incorrect questions, we could generate follow-up questions
    // But for now, we just trigger a refill if quota not met

    if (incorrectQuestionIds.length > 0) {
      console.log(
        `[BackgroundGen] ${incorrectQuestionIds.length} yanlış soru için takip soruları planlandı`,
      );
      // Future: Could insert into a queue table for follow-up generation
    }

    // Check if we need to refill quota
    const { count: existingCount } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("chunk_id", chunkId)
      .eq("usage_type", "antrenman");

    const { data: chunk } = await supabase
      .from("note_chunks")
      .select("word_count, metadata")
      .eq("id", chunkId)
      .single();

    if (!chunk) return;

    const wordCount = chunk.word_count || 500;
    const metadata = chunk.metadata as { concept_map?: unknown[] } || {};
    const conceptCount = (metadata.concept_map?.length) || 0;

    // Simple quota check
    const minQuota = 8;
    const maxQuota = 30;
    const growthRate = 1.1;
    const linearGrowth = (Math.max(0, wordCount) / 100) * growthRate;
    const rawBase = minQuota + linearGrowth;
    const baseCount = Math.min(maxQuota, rawBase);

    const safeWordCount = wordCount > 0 ? wordCount : 1;
    const cd = conceptCount / safeWordCount;
    let multiplier = 1.0;
    if (cd < 0.02) multiplier = 0.8;
    else if (cd > 0.05) multiplier = 1.3;

    const antrenmanQuota = Math.ceil(baseCount * multiplier);

    if ((existingCount || 0) < antrenmanQuota) {
      console.log(
        `[BackgroundGen] Kota dolmamış (${existingCount}/${antrenmanQuota}), arka plan üretimi tetikleniyor...`,
      );

      // Trigger Edge Function in background (fire-and-forget)
      // Trigger client-side generator in background
      generateQuestionsForChunk(chunkId, {
        onLog: (log: GenerationLog) => {
          // Optional: Filter logs to avoid spamming console
          if (log.step === "ERROR" || log.step === "COMPLETED") {
            console.log(`[BackgroundGen][${log.step}] ${log.message}`);
          }
        },
        onQuestionSaved: (total: number) => {
          console.log(`[BackgroundGen] Question saved. Total: ${total}`);
        },
        onComplete: (result: GenerationResult) => {
          console.log(
            `[BackgroundGen] Completed! Generated: ${result.generated}`,
          );
        },
        onError: (err: string) => {
          console.warn(`[BackgroundGen] Error: ${err}`);
        },
      }).catch((err: unknown) => {
        console.warn("[BackgroundGen] Generator failed:", err);
      });
    }
  } catch (e) {
    console.warn("[BackgroundGen] Error:", e);
    // Silent fail - background task
  }
}
