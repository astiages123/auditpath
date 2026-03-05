import { z } from 'zod';
import { logger } from '@/utils/logger';
import { type Json } from '@/types/database.types';
import { isValid, parseOrThrow } from '@/utils/validation';
import {
  AILogicSchema,
  ChunkWithContentSchema,
  type ConceptMapItem,
  ConceptMapResponseSchema,
  type GenerationStep,
  type ValidatedAILogic,
} from '../types';
import { GLOBAL_AI_SYSTEM_PROMPT, PromptArchitect } from './prompts';
import { generate, type StructuredOptions } from './structuredGenerator';
import { updateChunkAILogic } from '../services/quizSubmissionService';

/**
 * Bir içerik parçasını (chunk) analiz eder ve kavram haritası oluşturur.
 */
export async function analyzeNoteChunk(
  text: string,
  onLog?: (msg: string, details?: Record<string, unknown>) => void
): Promise<ValidatedAILogic | null> {
  onLog?.('Chunk analizi başlatılıyor...', { contentLength: text.length });

  try {
    const context = PromptArchitect.buildContext(text);
    const task = PromptArchitect.analysisPrompt(
      'Bilinmeyen Bölüm',
      'Genel Ders'
    );
    const messages = PromptArchitect.assemble(
      GLOBAL_AI_SYSTEM_PROMPT,
      context,
      task
    );

    const options: StructuredOptions<z.infer<typeof ConceptMapResponseSchema>> =
      {
        task: 'analysis',
        schema: ConceptMapResponseSchema,
        onLog: (m: string, d?: Record<string, unknown>) => onLog?.(m, d),
      };

    const result = await generate<z.infer<typeof ConceptMapResponseSchema>>(
      messages,
      options
    );

    if (!result) {
      throw new Error('Yapay zeka analiz raporu oluşturamadı.');
    }

    onLog?.('Analiz tamamlandı.', {
      difficulty: result.difficulty_index,
      conceptCount: result.concepts.length,
    });

    return {
      difficulty_index: result.difficulty_index,
      concept_map: result.concepts,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    onLog?.('Analiz sırasında hata!', { error: String(error) });
    logger.error(
      'ParserLogic',
      'analyzeNoteChunk',
      'Analiz hatası',
      error as Error
    );
    return null;
  }
}

/**
 * Belirli bir chunk için kavram haritası olmasını garanti eder (cache yoksa üretir).
 */
export async function ensureConcepts(
  chunkId: string,
  chunk: z.infer<typeof ChunkWithContentSchema>,
  log: (
    step: GenerationStep,
    msg: string,
    details?: Record<string, unknown>
  ) => void
): Promise<{ concepts: ConceptMapItem[]; difficultyIndex: number }> {
  const aiLogic = isValid(AILogicSchema, chunk.ai_logic)
    ? parseOrThrow(AILogicSchema, chunk.ai_logic)
    : {};

  const existingConcepts = (aiLogic.concept_map as ConceptMapItem[]) || [];
  const isCacheValid = existingConcepts.length > 0 && !aiLogic.invalidated_at;

  if (isCacheValid) {
    log('MAPPING', 'Önceden oluşturulmuş kavram haritası yükleniyor...');
    return {
      concepts: existingConcepts,
      difficultyIndex: aiLogic.difficulty_index || 3,
    };
  }

  log('MAPPING', 'Konunun kritik noktaları belirleniyor...');
  const analysisResult = await analyzeNoteChunk(chunk.content, (m, d) =>
    log('MAPPING', m, d)
  );

  if (!analysisResult) {
    throw new Error(
      'Kavram haritası oluşturulamadı. Sistem yoğun olabilir, lütfen tekrar deneyin.'
    );
  }

  const updatedAILogic = {
    ...(chunk.ai_logic !== null && typeof chunk.ai_logic === 'object'
      ? (chunk.ai_logic as Record<string, Json>)
      : {}),
    concept_map: analysisResult.concept_map as Json,
    difficulty_index: analysisResult.difficulty_index,
    generated_at: new Date().toISOString(),
    invalidated_at: null,
  };

  log('SAVING', 'Kavram haritası kaydediliyor...');
  const { error: analysisUpdateError } = await updateChunkAILogic(
    chunkId,
    updatedAILogic
  );

  if (analysisUpdateError) {
    console.error(
      '[ParserLogic][ensureConcepts] Güncelleme Hatası:',
      analysisUpdateError
    );
  }

  return {
    concepts: analysisResult.concept_map || [],
    difficultyIndex: analysisResult.difficulty_index || 3,
  };
}
