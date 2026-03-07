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
import { getChunkWithContent } from '../services/quizChunkService';
import {
  createQuestion,
  fetchCachedQuestionTitles,
} from '../services/quizRepository';

// Yeni modüllerden içe aktarmalar
import { determineNodeStrategy } from './quizParserStrategy';
import { ensureConcepts } from './analysis';
import { draftBatch } from './drafting';
import { validateBatch } from './validation';
import { reviseQuestions } from './revision';

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
    logger.error(
      'ParserLogic',
      'ensureQuotas',
      'Kota güncelleme hatası',
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
      (accumulator, usageType) =>
        accumulator + (quotas[usageType as keyof typeof quotas] || 0),
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
  for (const usageType of usageTypes) {
    const typeQuotas =
      options.targetCount || quotas[usageType as keyof typeof quotas];
    const targetConcepts =
      usageType === 'antrenman'
        ? concepts
        : shuffle([...concepts]).slice(0, typeQuotas);

    // Önceden üretilmiş soru başlıklarını topluca çekiyoruz (Batch Check)
    const cachedTitles = await fetchCachedQuestionTitles(chunk.id, usageType);

    let draftingBuffer: { index: number; concept: ConceptMapItem }[] = [];
    const batchSize = 3;

    for (
      let i = 0;
      i < targetConcepts.length && totalGeneratedCount < totalTarget;
      i++
    ) {
      if (options.signal?.aborted) {
        throw new Error('İşlem kullanıcı tarafından durduruldu.');
      }

      const concept = targetConcepts[i];
      const isCached = cachedTitles.has(concept.baslik);

      if (isCached) {
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

      if (draftingBuffer.length < batchSize && !isLastIteration) {
        continue;
      }

      log(
        'GENERATING',
        `${draftingBuffer.length} adet kavram için soru tasarlanıyor...`
      );

      const draftedBatchResult = await draftBatch({
        concepts: draftingBuffer,
        courseName: chunk.course_name || '',
        usageType,
        sharedContextPrompt: sharedContext,
      });

      if (!draftedBatchResult) {
        draftingBuffer = [];
        continue;
      }

      log(
        'VALIDATING',
        `${draftedBatchResult.length} soruluk bir grup doğrulanıyor...`
      );
      const validationResponse = await validateBatch(
        draftedBatchResult,
        cleanContent,
        chunk.course_name || undefined,
        chunk.section_title || undefined
      );

      // Onaylananları ve reddedilenleri ayır
      const approvedQuestions: {
        index: number;
        question: (typeof draftedBatchResult)[0];
      }[] = [];
      const rejectedEntries: {
        index: number;
        question: (typeof draftedBatchResult)[0];
        validation: {
          total_score: number;
          decision: 'APPROVED' | 'REJECTED';
          critical_faults: string[];
          improvement_suggestion: string;
        };
      }[] = [];

      for (let j = 0; j < draftedBatchResult.length; j++) {
        if (options.signal?.aborted) {
          throw new Error('İşlem kullanıcı tarafından durduruldu.');
        }

        const bufferItem = draftingBuffer[j];
        if (!bufferItem) continue;

        const question = draftedBatchResult[j];
        const validation =
          validationResponse?.results[j] ??
          validationResponse?.results.find(
            (validationResult) => validationResult.index === j
          );

        if (!validation || validation.decision === 'REJECTED') {
          rejectedEntries.push({
            index: j,
            question,
            validation: validation || {
              total_score: 0,
              decision: 'REJECTED' as const,
              critical_faults: ['Batch validation error'],
              improvement_suggestion: 'Soru formatı tamamen hatalı.',
            },
          });
        } else {
          approvedQuestions.push({ index: j, question });
        }
      }

      // Reddedilenleri toplu revize et
      const revisedMap = new Map<number, (typeof draftedBatchResult)[0]>();
      if (rejectedEntries.length > 0) {
        log(
          'REVISION',
          `${rejectedEntries.length} reddedilen soru toplu revize ediliyor...`
        );
        const revisedResults = await reviseQuestions(
          rejectedEntries.map((entry) => ({
            question: entry.question,
            validation: entry.validation,
          })),
          sharedContext
        );
        rejectedEntries.forEach((entry, revisionIndex) => {
          const revised = revisedResults[revisionIndex];
          if (revised) {
            revisedMap.set(entry.index, revised);
          }
        });
      }

      // Tüm soruları kaydet (onaylanan + başarıyla revize edilen)
      for (let j = 0; j < draftedBatchResult.length; j++) {
        const bufferItem = draftingBuffer[j];
        if (!bufferItem) continue;

        const question =
          revisedMap.get(j) ??
          approvedQuestions.find((item) => item.index === j)?.question;
        if (!question) {
          log(
            'REVISION',
            `Revizyon başarısız, kavram atlanıyor: ${bufferItem.concept.baslik}`
          );
          continue;
        }

        log('SAVING', `${bufferItem.concept.baslik} kütüphaneye ekleniyor...`);
        const { error: saveError } = await createQuestion({
          chunk_id: chunk.id,
          course_id: chunk.course_id,
          section_title: chunk.section_title || 'Genel',
          usage_type: usageType,
          bloom_level: (question.bloomLevel || 'knowledge') as
            | 'knowledge'
            | 'analysis'
            | 'application'
            | null,
          created_by: options.userId,
          question_data: {
            type: 'multiple_choice',
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

        if (!saveError) {
          totalGeneratedCount++;
          callbacks.onQuestionSaved(totalGeneratedCount);
        }
      }

      draftingBuffer = [];
    }
  }

  await updateChunkStatus(chunkId, 'COMPLETED');
  log('COMPLETED', 'Tüm işlemler başarıyla tamamlandı!');
  callbacks.onComplete({ success: true, generated: totalGeneratedCount });
}
