import { logger } from '@/utils/logger';
import { z } from 'zod';

import { getTaskConfig } from '@/utils/aiConfig';
import { type Json } from '@/types/database.types';
import { isValid, parseOrThrow } from '@/utils/validation';
import { shuffle } from '../utils/mathUtils';
import {
  AILogicSchema,
  BatchGeneratedQuestionSchema,
  BatchValidationResultSchema,
  ChunkWithContentSchema,
  type ConceptMapItem,
  ConceptMapResponseSchema,
  type GeneratedQuestion,
  GeneratedQuestionSchema,
  type GenerationStep,
  type GeneratorCallbacks,
  type ValidatedAILogic,
  type ValidationResult,
} from '../types';
import {
  GLOBAL_AI_SYSTEM_PROMPT,
  PromptArchitect,
  VALIDATION_SYSTEM_PROMPT,
} from './prompts';
import { generate, type StructuredOptions } from './structuredGenerator';
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

// Mevcut dışa aktarmaları koruyoruz (Public API bozulmasın diye re-export yapıyoruz)
export { determineNodeStrategy, getSubjectStrategy, parseJsonResponse };

// === SECTION: Analysis Logic ===

/**
 * Bir içerik parçasını (chunk) analiz eder ve kavram haritası oluşturur.
 * @param text - Analiz edilecek metin
 * @param onLog - Günlükleme callback'i
 * @returns Analiz sonucu ve kavram listesi
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
        model: 'smart',
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

// === SECTION: Question Generation Logic ===

/**
 * Belirli bir kavram için soru tasarlar.
 */
export async function draftQuestion(input: {
  concept: ConceptMapItem;
  index: number;
  courseName: string;
  usageType: 'antrenman' | 'deneme';
  sharedContextPrompt: string;
}) {
  const strategy = determineNodeStrategy(
    input.index,
    input.concept,
    input.courseName
  );
  if (!strategy) return null;

  const taskPrompt = PromptArchitect.draftingPrompt(
    [input.concept],
    strategy,
    input.usageType,
    undefined,
    input.courseName
  );
  const aiConfig = getTaskConfig('drafting');

  const messages = PromptArchitect.assemble(
    aiConfig.systemPromptPrefix
      ? aiConfig.systemPromptPrefix + '\n' + GLOBAL_AI_SYSTEM_PROMPT
      : GLOBAL_AI_SYSTEM_PROMPT,
    input.sharedContextPrompt,
    taskPrompt +
      '\n\n### ZORUNLU JSON FORMATI\nLütfen cevabını sadece geçerli bir JSON objesi olarak döndür.'
  );

  const result = await generate<z.infer<typeof GeneratedQuestionSchema>>(
    messages,
    {
      schema: GeneratedQuestionSchema,
      task: 'drafting',
    }
  );

  if (!result) return null;

  return {
    ...result,
    bloomLevel: strategy.bloomLevel,
    img: result.img ?? null,
    concept: input.concept.baslik,
    insight: result.insight ?? undefined,
  } satisfies GeneratedQuestion;
}

/**
 * Toplu soru tasarımı yapar.
 */
export async function draftBatch(input: {
  concepts: { concept: ConceptMapItem; index: number }[];
  courseName: string;
  usageType: 'antrenman' | 'deneme';
  sharedContextPrompt: string;
}): Promise<GeneratedQuestion[] | null> {
  if (input.concepts.length === 0) return [];

  const firstConcept = input.concepts[0];
  const strategy = determineNodeStrategy(
    firstConcept.index,
    firstConcept.concept,
    input.courseName
  );
  if (!strategy) return null;

  const taskPrompt = PromptArchitect.draftingPrompt(
    input.concepts.map((c) => c.concept),
    strategy,
    input.usageType,
    undefined,
    input.courseName
  );
  const aiConfig = getTaskConfig('drafting');

  const messages = PromptArchitect.assemble(
    aiConfig.systemPromptPrefix
      ? aiConfig.systemPromptPrefix + '\n' + GLOBAL_AI_SYSTEM_PROMPT
      : GLOBAL_AI_SYSTEM_PROMPT,
    input.sharedContextPrompt,
    taskPrompt +
      '\n\n### ZORUNLU JSON FORMATI\nLütfen cevabını sadece geçerli bir JSON objesi olarak döndür.'
  );

  const result = await generate<z.infer<typeof BatchGeneratedQuestionSchema>>(
    messages,
    {
      schema: BatchGeneratedQuestionSchema,
      task: 'drafting',
    }
  );

  if (!result) return null;

  return result.questions.map((q, i) => {
    const inputConcept = input.concepts[i] || input.concepts[0];
    const itemStrategy = determineNodeStrategy(
      inputConcept.index,
      inputConcept.concept,
      input.courseName
    );
    return {
      ...q,
      bloomLevel: itemStrategy?.bloomLevel || 'knowledge',
      img: q.img ?? null,
      concept: inputConcept.concept.baslik,
      insight: q.insight ?? undefined,
    } satisfies GeneratedQuestion;
  });
}

/**
 * Üretilen soruları doğrular.
 */
export async function validateBatch(
  questions: GeneratedQuestion[],
  content: string
): Promise<z.infer<typeof BatchValidationResultSchema> | null> {
  const contextPrompt = PromptArchitect.buildContext(
    PromptArchitect.cleanReferenceImages(content)
  );
  const taskPrompt = PromptArchitect.batchValidationPrompt(questions);
  const aiConfig = getTaskConfig('validation');

  const messages = PromptArchitect.assemble(
    aiConfig.systemPromptPrefix
      ? aiConfig.systemPromptPrefix + '\n' + VALIDATION_SYSTEM_PROMPT
      : VALIDATION_SYSTEM_PROMPT,
    contextPrompt,
    taskPrompt
  );

  const result = await generate<z.infer<typeof BatchValidationResultSchema>>(
    messages,
    {
      schema: BatchValidationResultSchema,
      task: 'validation',
    }
  );

  if (result) {
    // Skor bazlı karar düzeltme (Logic layer override)
    result.results.forEach((r) => {
      if (r.total_score >= 70 && r.decision === 'REJECTED') {
        r.decision = 'APPROVED';
      } else if (r.total_score < 70 && r.decision === 'APPROVED') {
        r.decision = 'REJECTED';
      }
    });
    return result;
  }
  return null;
}

/**
 * Hatalı soruyu revize eder.
 */
export async function reviseQuestion(
  originalQuestion: GeneratedQuestion,
  validationResult: ValidationResult,
  sharedContextPrompt: string
): Promise<GeneratedQuestion | null> {
  const revisionTask = `Aşağıdaki soru REDDEDİLMİŞTİR. Lütfen revize et.\n\n## REDDEDİLEN SORU:\n${JSON.stringify(
    {
      q: originalQuestion.q,
      o: originalQuestion.o,
      a: originalQuestion.a,
      exp: originalQuestion.exp,
    },
    null,
    2
  )}\n\n## KRİTİK HATALAR:\n${validationResult.critical_faults.join(
    '\n'
  )}\n\n## ÖNERİ:\n${validationResult.improvement_suggestion}`;

  const aiConfig = getTaskConfig('revision');

  const messages = PromptArchitect.assemble(
    aiConfig.systemPromptPrefix
      ? aiConfig.systemPromptPrefix + '\n' + GLOBAL_AI_SYSTEM_PROMPT
      : GLOBAL_AI_SYSTEM_PROMPT,
    sharedContextPrompt,
    revisionTask
  );

  const result = await generate<z.infer<typeof GeneratedQuestionSchema>>(
    messages,
    {
      schema: GeneratedQuestionSchema,
      task: 'revision',
    }
  );

  if (result) {
    return {
      ...result,
      bloomLevel: originalQuestion.bloomLevel,
      img: originalQuestion.img,
      concept: originalQuestion.concept,
      insight: result.insight ?? undefined,
    } satisfies GeneratedQuestion;
  }

  return null;
}

// === SECTION: Orchestration Logic ===

/**
 * Belirli bir chunk için kavram haritası olmasını garanti eder (cache yoksa üretir).
 */
async function ensureConcepts(
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
    ...(typeof chunk.ai_logic === 'object'
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
  const existingAILogic = (
    typeof chunk.ai_logic === 'object'
      ? (chunk.ai_logic as Record<string, Json>)
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
    existingQuotas.antrenman === quotas.antrenman
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
