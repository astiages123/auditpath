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

import { supabase } from '@/lib/supabase';
import type { Json } from '@/lib/types/supabase';
import { generateConceptMap, type ConceptMapItem } from './mapping';
import { generateQuestionBatch } from './question-generation';
import { validateQuestionBatch, type QuestionToValidate } from './validation';

// Constants
const BATCH_SIZE = 1; // Tek tek üretim - JSON hatalarını azaltır
const MIN_QUOTA = 8;
const MAX_QUOTA = 30;

// Types
export type LogStep = 'INIT' | 'QUOTA' | 'MAPPING' | 'GENERATING' | 'VALIDATING' | 'SAVING' | 'COMPLETED' | 'ERROR';

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
function createLog(step: LogStep, message: string, details: Record<string, unknown> = {}): GenerationLog {
  return {
    id: crypto.randomUUID(),
    step,
    message,
    details,
    timestamp: new Date()
  };
}

/**
 * Calculate quota based on word count and concept density
 */
export function calculateQuota(wordCount: number, conceptCount: number): { 
  total: number; 
  antrenman: number; 
  arsiv: number; 
  deneme: number;
  baseCount: number;
  multiplier: number;
  conceptDensity: number;
} {
  const growthRate = 1.1;
  const linearGrowth = (Math.max(0, wordCount) / 100) * growthRate;
  const rawBase = MIN_QUOTA + linearGrowth;
  const baseCount = Math.min(MAX_QUOTA, rawBase);

  const safeWordCount = wordCount > 0 ? wordCount : 1;
  const conceptDensity = conceptCount / safeWordCount;
  
  let multiplier = 1.0;
  if (conceptDensity < 0.02) multiplier = 0.8; // Sparse
  else if (conceptDensity > 0.05) multiplier = 1.3; // Dense
  
  const antrenman = Math.ceil(baseCount * multiplier);
  const arsiv = Math.ceil(antrenman * 0.25);
  const deneme = Math.ceil(antrenman * 0.25);

  return { 
    total: antrenman + arsiv + deneme, 
    antrenman, 
    arsiv, 
    deneme,
    baseCount: Math.round(baseCount * 100) / 100,
    multiplier,
    conceptDensity: Math.round(conceptDensity * 10000) / 10000
  };
}

/**
 * Main generator function
 */
export async function generateQuestionsForChunk(
  chunkId: string,
  callbacks: GeneratorCallbacks
): Promise<GenerationResult> {
  const { onLog, onQuestionSaved, onComplete, onError } = callbacks;
  
  const log = (step: LogStep, message: string, details: Record<string, unknown> = {}) => {
    const logEntry = createLog(step, message, details);
    onLog(logEntry);
    console.log(`[QuizGen][${step}] ${message}`, details);
  };

  try {
    // === STEP 1: INIT ===
    log('INIT', 'Chunk bilgileri yükleniyor...', { chunkId });

    const { data: chunk, error: chunkError } = await supabase
      .from('note_chunks')
      .select('id, content, word_count, course_id, course_name, section_title, metadata')
      .eq('id', chunkId)
      .single();

    if (chunkError || !chunk) {
      log('ERROR', 'Chunk bulunamadı', { error: chunkError?.message });
      onError('Chunk bulunamadı');
      return { success: false, generated: 0, quota: 0, error: 'Chunk not found' };
    }

    const chunkData = chunk as unknown as ChunkData;

    // Update chunk status
    await supabase.from('note_chunks').update({ status: 'PROCESSING' }).eq('id', chunkId);

    // Get existing question count
    const { count: existingCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('chunk_id', chunkId);

    log('INIT', `Chunk yüklendi`, {
      wordCount: chunkData.word_count,
      existingQuestions: existingCount || 0,
      contentPreview: chunkData.content.substring(0, 100) + '...'
    });

    // === STEP 2: MAPPING ===
    log('MAPPING', 'Kavram haritası çıkarılıyor...', {});

    let concepts: ConceptMapItem[];
    
    if (chunkData.metadata?.concept_map && chunkData.metadata.concept_map.length > 0) {
      concepts = chunkData.metadata.concept_map;
      log('MAPPING', `Mevcut kavram haritası kullanılıyor`, {
        conceptCount: concepts.length,
        concepts: concepts.map(c => c.baslik)
      });
    } else {
      concepts = await generateConceptMap(
        chunkData.content, 
        chunkData.word_count || 500,
        (msg, details) => log('MAPPING', msg, details || {})
      );
      
      if (concepts.length === 0) {
        log('ERROR', 'Kavram haritası oluşturulamadı', {});
        await supabase.from('note_chunks').update({ status: 'FAILED', error_message: 'Concept map failed' }).eq('id', chunkId);
        onError('Kavram haritası oluşturulamadı');
        return { success: false, generated: 0, quota: 0, error: 'Concept mapping failed' };
      }

      // Save concept map to metadata
      const newMetadata = { 
        ...chunkData.metadata, 
        concept_map: concepts,
        concept_map_created_at: new Date().toISOString()
      } as unknown as Json;
      
      await supabase.from('note_chunks').update({
        metadata: newMetadata
      }).eq('id', chunkId);

      log('MAPPING', `Kavram haritası oluşturuldu`, {
        conceptCount: concepts.length,
        concepts: concepts.map(c => c.baslik)
      });
    }

    // === STEP 3: QUOTA ===
    const quota = calculateQuota(chunkData.word_count || 500, concepts.length);
    const remaining = quota.antrenman - (existingCount || 0);

    log('QUOTA', 'Kota hesaplandı', {
      wordCount: chunkData.word_count,
      conceptCount: concepts.length,
      conceptDensity: quota.conceptDensity,
      baseCount: quota.baseCount,
      multiplier: quota.multiplier,
      antrenmanQuota: quota.antrenman,
      totalQuota: quota.total,
      existing: existingCount || 0,
      remaining
    });

    if (remaining <= 0) {
      log('COMPLETED', 'Kota zaten dolu, üretim yapılmadı', { quota: quota.antrenman });
      await supabase.from('note_chunks').update({ status: 'COMPLETED', is_ready: true }).eq('id', chunkId);
      const result: GenerationResult = { success: true, generated: 0, quota: quota.antrenman };
      onComplete(result);
      return result;
    }

    // Get subject guidelines
    const { data: guidelines } = await supabase
      .from('subject_guidelines')
      .select('*')
      .eq('subject_name', chunkData.course_name)
      .maybeSingle();

    // === STEP 4 & 5: GENERATING + VALIDATING in batches ===
    let totalGenerated = 0;
    let conceptIndex = 0;

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (totalGenerated < remaining && conceptIndex < concepts.length) {
      // API'leri yormamak için batch'ler arası kısa bir bekleme
      if (conceptIndex > 0) {
        log('GENERATING', 'Bir sonraki batch için kısa süre bekleniyor...', { delay: '2s' });
        await sleep(2000);
      }

      const batchConcepts = concepts.slice(conceptIndex, conceptIndex + BATCH_SIZE);
      const batchNum = Math.floor(conceptIndex / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(concepts.length / BATCH_SIZE);

      log('GENERATING', `Batch ${batchNum}/${totalBatches} üretiliyor...`, {
        batchStart: conceptIndex + 1,
        batchEnd: Math.min(conceptIndex + BATCH_SIZE, concepts.length),
        concepts: batchConcepts.map(c => c.baslik)
      });

      // Generate questions for this batch (new function signature)
      const generated = await generateQuestionBatch(
        chunkData.content,
        chunkData.course_name,
        chunkData.section_title,
        chunkData.word_count || 500,
        batchConcepts,
        conceptIndex,
        guidelines,
        (msg, details) => log('GENERATING', msg, details || {})
      );

      if (generated.length === 0) {
        log('ERROR', `Batch ${batchNum} üretilemedi, atlanıyor`, {});
        conceptIndex += BATCH_SIZE;
        continue;
      }

      log('VALIDATING', `${generated.length} soru doğrulanıyor...`, {
        questions: generated.map((q, i) => ({ index: i + 1, preview: q.q.substring(0, 60) + '...' }))
      });

      // Validate questions
      const validationResults = await validateQuestionBatch(
        generated as QuestionToValidate[],
        chunkData.content,
        (msg, details) => log('VALIDATING', msg, details || {})
      );

      // Process results
      let batchSaved = 0;
      for (let i = 0; i < generated.length; i++) {
        const question = generated[i];
        const validation = validationResults.find(v => v.questionIndex === i);

        if (!validation) continue;

        if (validation.decision === 'APPROVED') {
          log('SAVING', `Soru ${conceptIndex + i + 1} kaydediliyor...`, {
            decision: validation.decision,
            total_score: validation.total_score,
            criteria: validation.criteria_breakdown,
            questionPreview: question.q.substring(0, 60) + '...'
          });

          const { error: insertError } = await supabase.from('questions').insert({
            chunk_id: chunkId,
            course_id: chunkData.course_id,
            section_title: chunkData.section_title,
            usage_type: 'antrenman',
            bloom_level: question.bloomLevel || 'knowledge',
            quality_score: validation.total_score,
            validation_status: 'APPROVED',
            validator_feedback: JSON.stringify({
              criteria_breakdown: validation.criteria_breakdown,
              critical_faults: validation.critical_faults,
              improvement_suggestion: validation.improvement_suggestion
            }),
            question_data: {
              q: question.q,
              o: question.o,
              a: question.a,
              exp: question.exp,
              img: question.img || null
            }
          });

          if (!insertError) {
            batchSaved++;
            totalGenerated++;
            onQuestionSaved(totalGenerated);
            
            log('SAVING', `Soru ${conceptIndex + i + 1} kaydedildi`, {
              totalGenerated,
              remaining: remaining - totalGenerated
            });
          } else {
            log('ERROR', `Soru kaydedilemedi`, { error: insertError.message });
          }
        } else {
          log('VALIDATING', `Soru ${conceptIndex + i + 1} reddedildi`, {
            decision: validation.decision,
            total_score: validation.total_score,
            critical_faults: validation.critical_faults,
            improvement_suggestion: validation.improvement_suggestion
          });
        }

        if (totalGenerated >= remaining) break;
      }

      log('GENERATING', `Batch ${batchNum} tamamlandı: ${batchSaved}/${generated.length} soru kaydedildi`, {
        saved: batchSaved,
        total: generated.length
      });

      conceptIndex += BATCH_SIZE;
    }

    // === STEP 6: COMPLETED ===
    await supabase.from('note_chunks').update({ 
      status: 'COMPLETED', 
      is_ready: true
    }).eq('id', chunkId);

    log('COMPLETED', `Üretim tamamlandı: ${totalGenerated} yeni soru`, {
      generated: totalGenerated,
      quota: quota.antrenman,
      successRate: Math.round((totalGenerated / remaining) * 100) + '%'
    });

    const result: GenerationResult = { success: true, generated: totalGenerated, quota: quota.antrenman };
    onComplete(result);
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    log('ERROR', `Kritik hata: ${errorMessage}`, { error: errorMessage });
    
    try {
      await supabase.from('note_chunks').update({ status: 'FAILED', error_message: errorMessage }).eq('id', chunkId);
    } catch {
      // Ignore update error
    }

    onError(errorMessage);
    return { success: false, generated: 0, quota: 0, error: errorMessage };
  }
}

/**
 * Generate a single follow-up question for a wrong answer
 */
export async function generateFollowUpSingle(
  context: import('./question-generation').WrongAnswerContext,
  onLog: (msg: string, details?: unknown) => void
): Promise<string | null> {
  try {
    // 1. Fetch chunk and course data
    const { data: chunk, error: chunkError } = await supabase
      .from('note_chunks')
      .select('course_name, section_title')
      .eq('id', context.chunkId)
      .single();

    if (chunkError || !chunk) {
      onLog('HATA: Chunk bulunamadı');
      return null;
    }

    // 2. Fetch guidelines
    const { data: guidelines } = await supabase
      .from('subject_guidelines')
      .select('*')
      .eq('subject_name', chunk.course_name)
      .maybeSingle();

    // 3. Generate question (no validation stage for follow-ups to keep it fast/adaptive)
    const question = await import('./question-generation').then(m => 
      m.generateFollowUpQuestion(
        context,
        chunk.course_name,
        chunk.section_title,
        guidelines,
        (msg, details) => onLog(msg, details)
      )
    );

    if (!question) {
      onLog('HATA: Follow-up soru üretilemedi');
      return null;
    }

    // 4. Save to DB
    const { data: qData, error: qError } = await supabase.from('questions').insert({
      chunk_id: context.chunkId,
      course_id: context.courseId,
      section_title: chunk.section_title,
      usage_type: 'antrenman',
      bloom_level: 'application',
      quality_score: 80, // Default for follow-up
      validation_status: 'APPROVED',
      is_global: false, // User-specific follow-up
      created_by: context.userId,
      parent_question_id: context.originalQuestion.id,
      question_data: {
        q: question.q,
        o: question.o,
        a: question.a,
        exp: question.exp,
        img: question.img || null
      }
    }).select('id').single();

    if (qError) {
      onLog('HATA: Kaydedilemedi', { error: qError.message });
      return null;
    }

    onLog('BAŞARILI: Follow-up soru kaydedildi', { id: qData.id });
    return qData.id;

  } catch (error) {
    onLog('KRİTİK HATA: Follow-up süreci başarısız', { error: String(error) });
    return null;
  }
}
