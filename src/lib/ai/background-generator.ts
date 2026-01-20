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
import { generateQuizQuestion, calculateQuota } from './quiz-api';

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
  // Get word count and metadata to determine quota
  const { data: chunk, error } = await supabase
    .from('note_chunks')
    .select('word_count, metadata')
    .eq('id', chunkId)
    .single();

  if (error || !chunk) return false;

  const wordCount = chunk.word_count || 0;
  
  // Extract concept count
  const metadata = chunk.metadata as Record<string, unknown> || {};
  const conceptMap = (metadata.concept_map as unknown[]) || [];
  const conceptCount = conceptMap.length;

  const quota = calculateQuota(wordCount, conceptCount);
  const antrenmanQuota = quota.antrenmanCount;

  console.log(`[QuizGen/TR] ℹ️ Arka plan kontrolü: WordCount=${wordCount}, ConceptCount=${conceptCount}, Kota=${antrenmanQuota}`);

  // Count existing antrenman questions (exact count)
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('chunk_id', chunkId)
    .eq('usage_type', 'antrenman');

  const currentCount = count || 0;
  console.log(`[QuizGen/TR] ℹ️ Mevcut Antrenman Sayısı: ${currentCount}`);

  return currentCount >= antrenmanQuota;
}

/**
 * Get remaining quota for arsiv and deneme
 */
async function getRemainingQuota(chunkId: string): Promise<{ arsiv: number; deneme: number }> {
    // Get word count and metadata
    const { data: chunk } = await supabase
      .from('note_chunks')
      .select('word_count, metadata')
      .eq('id', chunkId)
      .single();
  
    if (!chunk) return { arsiv: 0, deneme: 0 };
  
    const wordCount = chunk.word_count || 0;
    
    const metadata = chunk.metadata as Record<string, unknown> || {};
    const conceptMap = (metadata.concept_map as unknown[]) || [];
    const conceptCount = conceptMap.length;
  
    const quota = calculateQuota(wordCount, conceptCount);
  
    // Arsiv and Deneme quotas from the calculation
    const arsivQuota = quota.arsivCount;
    const denemeQuota = quota.denemeCount;
  
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

export async function startBackgroundGeneration(chunkId: string): Promise<void> {
  // Prevent multiple runs
  if (generationStatus.isRunning) {
    console.log('[QuizGen/TR] ⚠️ Arka plan üretimi zaten çalışıyor.');
    return;
  }

  // Check if antrenman is complete (Strict Rule)
  const antrenmanComplete = await isAntrenmanComplete(chunkId);
  if (!antrenmanComplete) {
    console.log('[QuizGen/TR] 🛑 Antrenman kotası dolmadığı için arka plan üretimi durduruldu.');
    return;
  } else {
    console.log('[QuizGen/TR] ✅ Antrenman kotası dolu. Arka plan üretimine geçiliyor.');
  }

  // Get remaining quota
  const remaining = await getRemainingQuota(chunkId);
  const totalRemaining = remaining.arsiv + remaining.deneme;

  console.log(`[QuizGen/TR] 🎯 Hedeflenen Arka Plan Üretimi: ${remaining.arsiv} Arşiv, ${remaining.deneme} Deneme.`);

  if (totalRemaining === 0) {
    console.log('[QuizGen/TR] ✅ Tüm kotalar dolu (Arşiv/Deneme). Üretilecek soru kalmadı.');
    return;
  }

  console.log(`[QuizGen/TR] 🚀 Arka plan üretimi başlıyor! Hedef: ${remaining.arsiv} Arşiv, ${remaining.deneme} Deneme.`);

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
      console.log(`[QuizGen/TR] ⏳ Üretiliyor (Arşiv) ${i + 1}/${remaining.arsiv}...`);
      const result = await generateQuizQuestion(chunkId, { usageType: 'arsiv' });
      
      if (result.success) {
        generationStatus.generatedCount++;
        console.log(`[QuizGen/TR] ✅ Arşiv sorusu üretildi (${i + 1}/${remaining.arsiv}).`);
      } else {
        console.warn(`[QuizGen/TR] ⚠️ Arşiv üretimi başarısız:`, result.error);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Then Deneme questions
    generationStatus.currentType = 'deneme';
    for (let i = 0; i < remaining.deneme; i++) {
      console.log(`[QuizGen/TR] ⏳ Üretiliyor (Deneme) ${i + 1}/${remaining.deneme}...`);
      const result = await generateQuizQuestion(chunkId, { usageType: 'deneme' });
      
      if (result.success) {
         generationStatus.generatedCount++;
         console.log(`[QuizGen/TR] ✅ Deneme sorusu üretildi (${i + 1}/${remaining.deneme}).`);
      } else {
         console.warn(`[QuizGen/TR] ⚠️ Deneme üretimi başarısız:`, result.error);
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log('[QuizGen/TR] 🎉 Arka plan üretimi tamamlandı ve veritabanına kaydedildi.');

  } catch (err) {
    console.error('[QuizGen/TR] ❌ Beklenmeyen hata:', err);
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
      await import('./followup-generator').then(async ({ startFollowupGeneration }) => {
          await startFollowupGeneration(incorrectQuestionIds, courseId, userId).catch(err => {
              console.error('[QuizGen/TR] Follow-up generation failed:', err);
          });
          // Rate limit protection: Add a delay after follow-up generation
          await new Promise(resolve => setTimeout(resolve, 2000));
      });
  }

  // 2. Trigger Quota Refill (Low Priority - Fire and forget)
  startBackgroundGeneration(chunkId).catch(err => {
    console.error('[QuizGen/TR] Quota refill trigger failed:', err);
  });
}
