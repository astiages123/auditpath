import { logger } from '@/utils/logger';
import { z } from 'zod';

import { type Json } from '@/types/database.types';
import { parseOrThrow } from '@/utils/validation';
import { shuffle } from '../utils/mathUtils';
import {
  ChunkWithContentSchema,
  type ConceptMapItem,
  type GenerationStep,
  type GeneratorCallbacks,
} from '../types';
import { PromptArchitect } from './prompts';
import { calculateQuotas } from './quizCoreLogic';
import { getSubjectGuidelines } from '../services/quizInfoService';
import {
  updateChunkAILogic,
  updateChunkStatus,
} from '../services/quizSubmissionService';
import { getChunkWithContent } from '../services/quizCoreService';
import {
  createQuestion,
  fetchCachedQuestion,
} from '../services/quizQuestionService';

// Yeni modüllerden içe aktarmalar
import {
  determineNodeStrategy,
  getSubjectStrategy,
} from './quizParserStrategy';
import { parseJsonResponse } from './quizParserHelpers';
import { analyzeNoteChunk, ensureConcepts } from './analysis';
import { draftBatch, draftQuestion } from './drafting';
import { validateBatch } from './validation';
import { reviseQuestion } from './revision';

// Mevcut dışa aktarmaları koruyoruz (Public API bozulmasın diye re-export yapıyoruz)
export {
  analyzeNoteChunk,
  determineNodeStrategy,
  draftBatch,
  draftQuestion,
  ensureConcepts,
  ensureQuotas,
  getSubjectStrategy,
  parseJsonResponse,
  reviseQuestion,
  validateBatch,
};

// === SECTION: Orchestration Logic ===

/**
 * Belirli bir chunk için kotaları garanti eder.
 */
async function ensureQuotas(
  chunkId: string,
  chunk: z.infer<typeof ChunkWithContentSchema>,
  concepts: ConceptMapItem[],
  log: (
    step: GenerationStep,
    msg: string,
    details?: Record<string, unknown>
  ) => void
) {
  const quotas = calculateQuotas(concepts);

  // DB'den güncel ai_logic'i çek — ensureConcepts zaten kaydetmiş olabilir
  const freshChunk = await getChunkWithContent(chunkId);
  const freshAILogic = freshChunk?.ai_logic;
  const existingAILogic = (
    freshAILogic !== null && typeof freshAILogic === 'object'
      ? (freshAILogic as Record<string, Json>)
      : {}
  ) as Record<string, Json>;

  const existingQuotas = existingAILogic.suggested_quotas as
    | { antrenman: number; deneme: number }
    | null
    | undefined;

  const isInvalidated = existingAILogic.invalidated_at != null;

  if (
    existingQuotas &&
    !isInvalidated &&
    existingQuotas.antrenman === quotas.antrenman &&
    existingQuotas.deneme === quotas.deneme
  ) {
    log('MAPPING', 'Önceden hesaplanmış kotalar yükleniyor...');
    return existingQuotas;
  }

  const quotaAILogic: Record<string, Json> = {
    ...existingAILogic,

    suggested_quotas: quotas as Json,
    reasoning:
      typeof existingAILogic.reasoning === 'string'
        ? existingAILogic.reasoning
        : 'Otomatik pedagojik kotalar.',
  };

  log('SAVING', 'Pedagojik kotalar güncelleniyor...');
  const { error: quotaUpdateError } = await updateChunkAILogic(
    chunkId,
    quotaAILogic
  );

  if (quotaUpdateError) {
    console.error(
      '[ParserLogic][ensureQuotas] Kotas Hatası:',
      quotaUpdateError
    );
  }

  return quotas;
}

/**
 * Chunk bazlı toplu üretim işlemini yönetir (Orchestration).
 */
export async function generateForChunk(
  chunkId: string,
  callbacks: GeneratorCallbacks,
  options: {
    targetCount?: number;
    usageType?: 'antrenman' | 'deneme';
    userId?: string;
    signal?: AbortSignal;
  } = {}
) {
  const log = (
    step: GenerationStep,
    message: string,
    details: Record<string, unknown> = {}
  ) => {
    callbacks.onLog({
      id: crypto.randomUUID(),
      step,
      message,
      details,
      timestamp: new Date(),
    });
  };

  try {
    log('INIT', 'Ders materyalleri kütüphaneden alınıyor...');
    await updateChunkStatus(chunkId, 'PROCESSING');
    const rawChunk = await getChunkWithContent(chunkId);
    if (!rawChunk) throw new Error(`Chunk (ID: ${chunkId}) bulunamadı.`);

    const chunk = parseOrThrow(ChunkWithContentSchema, rawChunk);

    const { concepts } = await ensureConcepts(chunkId, chunk, log);
    const quotas = await ensureQuotas(chunkId, chunk, concepts, log);

    const usageTypes: ('antrenman' | 'deneme')[] = options.usageType
      ? [options.usageType]
      : ['antrenman', 'deneme'];

    const totalTarget =
      options.targetCount ||
      usageTypes.reduce(
        (acc, type) => acc + (quotas[type as keyof typeof quotas] || 0),
        0
      );

    callbacks.onTotalTargetCalculated(totalTarget);

    const guidelines = await getSubjectGuidelines(chunk.course_name || '');
    const cleanContent = PromptArchitect.cleanReferenceImages(chunk.content);
    const sharedContext = PromptArchitect.buildContext(
      cleanContent,
      chunk.course_name || '',
      chunk.section_title || '',
      guidelines || undefined
    );

    let totalGeneratedCount = 0;
    for (const type of usageTypes) {
      const typeQuotas =
        options.targetCount || quotas[type as keyof typeof quotas];
      const targetConcepts =
        type === 'antrenman'
          ? concepts
          : shuffle([...concepts]).slice(0, typeQuotas);

      let draftingBuffer: { index: number; concept: ConceptMapItem }[] = [];
      const BATCH_SIZE = 3;

      for (
        let i = 0;
        i < targetConcepts.length && totalGeneratedCount < totalTarget;
        i++
      ) {
        if (options.signal?.aborted) {
          throw new Error('İşlem kullanıcı tarafından durduruldu.');
        }
        const concept = targetConcepts[i];
        const cached = await fetchCachedQuestion(
          chunk.id,
          type,
          concept.baslik
        );

        if (cached) {
          totalGeneratedCount++;
          callbacks.onQuestionSaved(totalGeneratedCount);
          continue;
        }

        const nodeStrategy = determineNodeStrategy(
          i,
          concept,
          chunk.course_name || ''
        );
        if (!nodeStrategy) {
          log(
            'GENERATING',
            `"${concept.baslik}" grafik gerektiriyor, atlanıyor.`
          );
          continue;
        }

        draftingBuffer.push({ index: i, concept });

        const isLastIteration =
          i === targetConcepts.length - 1 ||
          draftingBuffer.length + totalGeneratedCount >= totalTarget;

        if (
          draftingBuffer.length >= BATCH_SIZE ||
          (isLastIteration && draftingBuffer.length > 0)
        ) {
          log(
            'GENERATING',
            `${draftingBuffer.length} adet kavram için soru tasarlanıyor...`
          );

          const draftedBatchResult = await draftBatch({
            concepts: draftingBuffer,
            courseName: chunk.course_name || '',
            usageType: type,
            sharedContextPrompt: sharedContext,
          });

          if (draftedBatchResult) {
            log(
              'VALIDATING',
              `${draftedBatchResult.length} soruluk bir grup doğrulanıyor...`
            );
            const validationResponse = await validateBatch(
              draftedBatchResult,
              cleanContent
            );

            for (let j = 0; j < draftedBatchResult.length; j++) {
              if (options.signal?.aborted) {
                throw new Error('İşlem kullanıcı tarafından durduruldu.');
              }
              const bufferItem = draftingBuffer[j];
              if (!bufferItem) continue;

              let question = draftedBatchResult[j];
              const validation =
                validationResponse?.results[j] ??
                validationResponse?.results.find((r) => r.index === j);

              if (!validation || validation.decision === 'REJECTED') {
                log(
                  'REVISION',
                  `${bufferItem.concept.baslik} sorusu için revizyon yapılıyor...`
                );
                const revised = await reviseQuestion(
                  question,
                  validation || {
                    index: j,
                    total_score: 0,
                    decision: 'REJECTED',
                    critical_faults: ['Batch validation error'],
                    improvement_suggestion: 'Soru formatı tamamen hatalı.',
                  },
                  sharedContext
                );

                if (!revised) {
                  log(
                    'REVISION',
                    `Revizyon başarısız, kavram atlanıyor: ${bufferItem.concept.baslik}`
                  );
                  continue;
                }
                question = revised;
              }

              log(
                'SAVING',
                `${bufferItem.concept.baslik} kütüphaneye ekleniyor...`
              );
              const { error: saveErr } = await createQuestion({
                chunk_id: chunk.id,
                course_id: chunk.course_id,
                section_title: chunk.section_title || 'Genel',
                usage_type: type,
                bloom_level: (question.bloomLevel || 'knowledge') as
                  | 'knowledge'
                  | 'analysis'
                  | 'application'
                  | null,
                created_by: options.userId,
                question_data: {
                  q: question.q,
                  o: question.o,
                  a: question.a,
                  exp: question.exp,
                  img: question.img,
                  evidence: question.evidence,
                  diagnosis: question.diagnosis,
                  insight: question.insight,
                } as Json,
                concept_title: bufferItem.concept.baslik,
              });

              if (!saveErr) {
                totalGeneratedCount++;
                callbacks.onQuestionSaved(totalGeneratedCount);
              }
            }
          }
          draftingBuffer = [];
        }
      }
    }

    await updateChunkStatus(chunkId, 'COMPLETED');
    log('COMPLETED', 'Tüm işlemler başarıyla tamamlandı!');
    callbacks.onComplete({ success: true, generated: totalGeneratedCount });
  } catch (e: unknown) {
    const error = e as Error;
    logger.error('ParserLogic', 'generateForChunk', 'Üretim hatası', error);
    log('ERROR', `Hata oluştu: ${error.message}`);
    callbacks.onError(error.message || 'Error occurred during generation.');
    await updateChunkStatus(chunkId, 'FAILED');
  }
}
