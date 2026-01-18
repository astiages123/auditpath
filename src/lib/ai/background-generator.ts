/**
 * Background Question Generator
 *
 * Bu modül, Antrenman soruları bittiğinde arka planda
 * Arşiv ve Deneme sorularını üretir.
 *
 * - Antrenman tamamlandığında tetiklenir
 * - Arşiv ve Deneme kotasını doldurur
 * - Fire-and-forget çalışır (UI'ı bloklamaz)
 */

import { supabase } from '../supabase';
import { generateQuizQuestion } from './quiz-api';

// --- Types ---
export interface BackgroundGenerationStatus {
  isRunning: boolean;
  chunkId: string | null;
  generatedCount: number;
  targetCount: number;
  currentType: 'arsiv' | 'deneme' | null;
}

// --- State ---
let generationStatus: BackgroundGenerationStatus = {
  isRunning: false,
  chunkId: null,
  generatedCount: 0,
  targetCount: 0,
  currentType: null,
};

/**
 * Get current generation status
 */
export function getBackgroundGenerationStatus(): BackgroundGenerationStatus {
  return { ...generationStatus };
}

/**
 * Check if Antrenman is complete for a chunk
 */
async function isAntrenmanComplete(chunkId: string): Promise<boolean> {
  // Get word count to determine quota
  const { data: chunk, error } = await supabase
    .from('note_chunks')
    .select('word_count')
    .eq('id', chunkId)
    .single();

  if (error || !chunk) return false;

  const wordCount = chunk.word_count || 0;
  // Kota değerleri quiz-api.ts ile tutarlı (4/8/12/20)
  let antrenmanQuota = 4;
  if (wordCount <= 150) antrenmanQuota = 4;
  else if (wordCount <= 500) antrenmanQuota = 8;
  else if (wordCount <= 1200) antrenmanQuota = 12;
  else antrenmanQuota = 20;

  // Count existing antrenman questions
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('chunk_id', chunkId)
    .eq('usage_type', 'antrenman');

  return (count || 0) >= antrenmanQuota;
}

/**
 * Get remaining quota for arsiv and deneme
 */
async function getRemainingQuota(chunkId: string): Promise<{ arsiv: number; deneme: number }> {
  // Get word count
  const { data: chunk } = await supabase
    .from('note_chunks')
    .select('word_count')
    .eq('id', chunkId)
    .single();

  if (!chunk) return { arsiv: 0, deneme: 0 };

  const wordCount = chunk.word_count || 0;
  // Kota değerleri quiz-api.ts ile tutarlı (4/8/12/20)
  let antrenmanQuota = 4;
  if (wordCount <= 150) antrenmanQuota = 4;
  else if (wordCount <= 500) antrenmanQuota = 8;
  else if (wordCount <= 1200) antrenmanQuota = 12;
  else antrenmanQuota = 20;

  // Arsiv and Deneme are 25% of Antrenman each
  const arsivQuota = Math.floor(antrenmanQuota * 0.25);
  const denemeQuota = Math.floor(antrenmanQuota * 0.25);

  // Count existing
  const { count: arsivCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('chunk_id', chunkId)
    .eq('usage_type', 'arsiv');

  const { count: denemeCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('chunk_id', chunkId)
    .eq('usage_type', 'deneme');

  return {
    arsiv: Math.max(0, arsivQuota - (arsivCount || 0)),
    deneme: Math.max(0, denemeQuota - (denemeCount || 0)),
  };
}

/**
 * Generate background questions for a chunk
 * Called when Antrenman is complete
 */
export async function startBackgroundGeneration(chunkId: string): Promise<void> {
  // Prevent multiple runs
  if (generationStatus.isRunning) {

    return;
  }

  // Check if antrenman is complete
  const antrenmanComplete = await isAntrenmanComplete(chunkId);
  if (!antrenmanComplete) {

    return;
  }

  // Get remaining quota
  const remaining = await getRemainingQuota(chunkId);
  const totalRemaining = remaining.arsiv + remaining.deneme;

  if (totalRemaining === 0) {

    return;
  }



  // Update status
  generationStatus = {
    isRunning: true,
    chunkId,
    generatedCount: 0,
    targetCount: totalRemaining,
    currentType: remaining.arsiv > 0 ? 'arsiv' : 'deneme',
  };

  // Generate questions in background
  try {
    // Generate Arsiv questions first
    for (let i = 0; i < remaining.arsiv; i++) {

      const result = await generateQuizQuestion(chunkId);
      
      if (result.success) {
        generationStatus.generatedCount++;

      } else {
        console.warn(`[BackgroundGen] Arsiv ${i + 1} failed:`, result.error);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Then Deneme questions
    generationStatus.currentType = 'deneme';
    for (let i = 0; i < remaining.deneme; i++) {

      const result = await generateQuizQuestion(chunkId);
      
      if (result.success) {
        generationStatus.generatedCount++;

      } else {
        console.warn(`[BackgroundGen] Deneme ${i + 1} failed:`, result.error);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }


  } catch (err) {
    console.error('[BackgroundGen] Error during generation:', err);
  } finally {
    // Reset status
    generationStatus = {
      isRunning: false,
      chunkId: null,
      generatedCount: 0,
      targetCount: 0,
      currentType: null,
    };
  }
}

/**
 * Check if background generation should start and trigger it
 * Call this when a quiz session ends
 */
export async function checkAndTriggerBackgroundGeneration(
    chunkId: string, 
    incorrectQuestionIds: string[] = [],
    courseId: string,
    userId: string
): Promise<void> {  
    
  // 1. Trigger Follow-up Generation (High Priority)
  if (incorrectQuestionIds.length > 0) {
      import('./followup-generator').then(({ startFollowupGeneration }) => {
          startFollowupGeneration(incorrectQuestionIds, courseId, userId).catch(err => {
              console.error('[BackgroundGen] Follow-up generation failed:', err);
          });
      });
  }

  // 2. Trigger Quota Refill (Low Priority - Fire and forget)
  startBackgroundGeneration(chunkId).catch(err => {
    console.error('[BackgroundGen] Quota refill trigger failed:', err);
  });
}
