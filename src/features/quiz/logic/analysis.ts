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

type AnalysisLogCallback = (
  message: string,
  details?: Record<string, unknown>
) => void;

/**
 * Bir içerik parçasını (chunk) analiz eder ve kavram haritası oluşturur.
 */
export async function analyzeNoteChunk(
  text: string,
  contextInfo?: {
    courseName?: string;
    sectionTitle?: string;
  },
  onLog?: AnalysisLogCallback
): Promise<ValidatedAILogic> {
  onLog?.('Chunk analizi başlatılıyor...', { contentLength: text.length });

  const context = PromptArchitect.buildContext(
    text,
    contextInfo?.courseName,
    contextInfo?.sectionTitle
  );
  const task = PromptArchitect.analysisPrompt(
    contextInfo?.sectionTitle || 'Bilinmeyen Bölüm',
    contextInfo?.courseName || 'Genel Ders'
  );
  const messages = PromptArchitect.assemble(
    GLOBAL_AI_SYSTEM_PROMPT,
    context,
    task
  );

  const options: StructuredOptions<z.infer<typeof ConceptMapResponseSchema>> = {
    task: 'analysis',
    schema: ConceptMapResponseSchema,
    onLog: (message: string, details?: Record<string, unknown>) =>
      onLog?.(message, details),
  };

  const result = await generate<z.infer<typeof ConceptMapResponseSchema>>(
    messages,
    options
  );

  if (!result) {
    const analysisError = new Error('Yapay zeka analiz raporu oluşturamadı.');
    onLog?.('Analiz sırasında hata!', { error: String(analysisError) });
    logger.error(
      'ParserLogic',
      'analyzeNoteChunk',
      'Analiz hatası',
      analysisError
    );
    throw analysisError;
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
  const analysisResult = await analyzeNoteChunk(
    chunk.content,
    {
      courseName: chunk.course_name || undefined,
      sectionTitle: chunk.section_title || undefined,
    },
    (message, details) => log('MAPPING', message, details)
  );

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
  const updateResult = await updateChunkAILogic(chunkId, updatedAILogic);
  if (updateResult.error) {
    logger.error(
      'ParserLogic',
      'ensureConcepts',
      'Güncelleme Hatası',
      updateResult.error
    );
  }

  return {
    concepts: analysisResult.concept_map || [],
    difficultyIndex: analysisResult.difficulty_index || 3,
  };
}
