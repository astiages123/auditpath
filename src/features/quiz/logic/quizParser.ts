import { z } from 'zod';
import { type Json } from '@/types/database.types';
import {
  AILogicSchema,
  BatchGeneratedQuestionSchema,
  BatchValidationResult,
  BatchValidationResultSchema,
  ChunkWithContentSchema,
  type ConceptMapItem,
  ConceptMapResponseSchema,
  type GeneratedQuestion,
  GeneratedQuestionSchema,
  type GenerationStep,
  type GeneratorCallbacks,
  type ValidationResult,
} from '@/features/quiz/types';
import {
  BLOOM_INSTRUCTIONS,
  buildAnalysisPrompt,
  buildBatchValidationPrompt,
  buildDraftingPrompt,
  GLOBAL_AI_SYSTEM_PROMPT,
  PromptArchitect,
  VALIDATION_SYSTEM_PROMPT,
} from '@/features/quiz/logic/prompts';
import { StructuredGenerator } from '@/features/quiz/logic/structuredGenerator';
import { getTaskConfig } from '@/utils/aiConfig';
import { isValid, parseOrThrow } from '@/utils/validation';
import { logger } from '@/utils/logger';
import { getSubjectGuidelines } from '@/features/quiz/services/quizInfoService';
import * as Repository from '@/features/quiz/services/quizService';
import { updateChunkAILogic } from '@/features/quiz/services/quizSubmissionService';
import { type BloomLevel, calculateQuotas } from './quizCoreLogic';
import {
  CATEGORY_DISTRIBUTIONS,
  CATEGORY_MAPPINGS,
  type CourseCategory,
  DEFAULT_CATEGORY,
  EXAM_STRATEGY,
} from '@/features/courses/utils/constants';
import type { ExamSubjectWeight } from '@/features/quiz/types';
import { shuffle } from '../utils/mathUtils';

const parserLogger = logger.withPrefix('[ParserLogic]');

// === SECTION === Subject Strategy Helpers (formerly in srsLogic)

export function getSubjectStrategy(
  courseName: string
): ExamSubjectWeight | undefined {
  const normalizedName = courseName
    .trim()
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/ /g, '-')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

  return (
    EXAM_STRATEGY[normalizedName] || EXAM_STRATEGY[courseName] || undefined
  );
}

function getCourseCategory(courseName: string): CourseCategory {
  return CATEGORY_MAPPINGS[courseName] || DEFAULT_CATEGORY;
}

export function determineNodeStrategy(
  index: number,
  concept?: ConceptMapItem,
  courseName: string = ''
): {
  bloomLevel: BloomLevel;
  instruction: string;
} {
  if (concept?.seviye) {
    if (concept.seviye === 'Analiz') {
      return {
        bloomLevel: 'analysis',
        instruction: BLOOM_INSTRUCTIONS.analysis,
      };
    }
    if (concept.seviye === 'Uygulama') {
      return {
        bloomLevel: 'application',
        instruction: BLOOM_INSTRUCTIONS.application,
      };
    }
    if (concept.seviye === 'Bilgi') {
      return {
        bloomLevel: 'knowledge',
        instruction: BLOOM_INSTRUCTIONS.knowledge,
      };
    }
  }

  const category = getCourseCategory(courseName);
  const distribution = CATEGORY_DISTRIBUTIONS[category];
  const cycleIndex = index % 10;
  const targetBloomLevel = (distribution[cycleIndex] ||
    'knowledge') as BloomLevel;

  return {
    bloomLevel: targetBloomLevel,
    instruction: BLOOM_INSTRUCTIONS[targetBloomLevel],
  };
}

// FALLBACK_QUESTION removed based on audit recommendation.
// Revision failures will now return null and be skipped.

// === SECTION === Parsing Utilities

/**
 * Parse JSON from LLM response (simple extraction)
 */
export function parseJsonResponse(
  text: string | null | undefined,
  type: 'object' | 'array',
  onLog?: (msg: string, details?: Record<string, unknown>) => void
): unknown {
  if (!text || typeof text !== 'string') return null;

  try {
    let cleanText = text.trim();

    // 0. </think>...</think> bloklarını temizle (Qwen modelleri bunu ekliyor)
    cleanText = cleanText
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*/gi, '')
      .trim();

    // 1. Markdown bloklarını temizle (```json ... ``` veya sadece ``` ... ```)
    const markdownMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (markdownMatch) {
      cleanText = markdownMatch[1].trim();
    }

    // 2. Daha güvenli JSON ayıklama - indexOf ve lastIndexOf kullanarak
    const firstChar = type === 'array' ? '[' : '{';
    const lastChar = type === 'array' ? ']' : '}';
    const start = cleanText.indexOf(firstChar);
    const end = cleanText.lastIndexOf(lastChar);

    if (start !== -1) {
      if (end !== -1 && end > start) {
        cleanText = cleanText.substring(start, end + 1);
      } else {
        // Truncated or invalid end - take from start onwards to let forgiving parser try
        cleanText = cleanText.substring(start);
      }
    } else {
      onLog?.('Geçerli JSON yapısı bulunamadı', {
        text: cleanText.substring(0, 100),
      });
      return null;
    }
    // 3. LaTeX Backslash Düzeltme (PRE-PROCESS)
    const regex = /(\\["\\/nrt]|\\u[0-9a-fA-F]{4})|(\\)/g;

    cleanText = cleanText.replace(regex, (match, valid, invalid) => {
      if (valid) return valid;
      if (invalid) return '\\\\';
      return match;
    });

    // 4. Forgiving JSON Parser for Truncated Responses
    try {
      return JSON.parse(cleanText);
    } catch (e) {
      const closers = ['}', ']', '"}', '"]', '}', ']', ']}', '}}'];

      for (const closer of closers) {
        try {
          return JSON.parse(cleanText + closer);
        } catch {
          continue;
        }
      }

      logger.warn('JSON Parse Error (Unrecoverable):', {
        error: e as Error,
        context: 'Quiz Utils',
      });
      return null;
    }
  } catch (e) {
    logger.error('JSON Parse Error (Critical):', {
      error: e as Error,
      context: 'Quiz Utils',
    });
    return null;
  }
}

// === SECTION === Analysis & Question Generation

export async function runChunkAnalysis(input: {
  content: string;
  courseName: string;
  sectionTitle: string;
  importance: 'high' | 'medium' | 'low';
}) {
  const systemPrompt = buildAnalysisPrompt(
    input.sectionTitle,
    input.courseName,
    input.importance
  );
  const contextPrompt = PromptArchitect.buildContext(
    PromptArchitect.cleanReferenceImages(input.content)
  );
  const aiConfig = getTaskConfig('analysis');

  const messages = PromptArchitect.assemble(
    aiConfig.systemPromptPrefix
      ? aiConfig.systemPromptPrefix + '\n' + systemPrompt
      : systemPrompt,
    contextPrompt,
    `Ders Önem Derecesi: ${input.importance}\nLütfen kavram haritasını ve bilişsel zorluk endeksini oluştur. JSON formatında çıktı ver.`
  );

  return await StructuredGenerator.generate(messages, {
    schema: ConceptMapResponseSchema,
    task: 'analysis',
    throwOnValidationError: true,
  });
}

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
  const taskPrompt = buildDraftingPrompt(
    [input.concept],
    strategy,
    input.usageType
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

  const result = await StructuredGenerator.generate(messages, {
    schema: GeneratedQuestionSchema,
    task: 'drafting',
  });

  if (!result) return null;

  return {
    ...result,
    bloomLevel: strategy.bloomLevel,
    img: result.img ?? null,
    concept: input.concept.baslik,
    insight: result.insight ?? undefined,
  } satisfies GeneratedQuestion;
}

export async function draftBatch(input: {
  concepts: { concept: ConceptMapItem; index: number }[];
  courseName: string;
  usageType: 'antrenman' | 'deneme';
  sharedContextPrompt: string;
}): Promise<GeneratedQuestion[] | null> {
  if (input.concepts.length === 0) return [];

  const strategy = determineNodeStrategy(
    input.concepts[0].index,
    input.concepts[0].concept,
    input.courseName
  );
  const taskPrompt = buildDraftingPrompt(
    input.concepts.map((c) => c.concept),
    strategy,
    input.usageType
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

  const result = await StructuredGenerator.generate(messages, {
    schema: BatchGeneratedQuestionSchema,
    task: 'drafting',
    throwOnValidationError: true,
  });

  if (!result) return null;

  return result.questions.map((q, i) => {
    // LLM might return fewer questions than requested in case of error, handle gently
    const inputConcept = input.concepts[i] || input.concepts[0];
    const itemStrategy = determineNodeStrategy(
      inputConcept.index,
      inputConcept.concept,
      input.courseName
    );
    return {
      ...q,
      bloomLevel: itemStrategy.bloomLevel,
      img: q.img ?? null,
      concept: inputConcept.concept.baslik,
      insight: q.insight ?? undefined,
    } satisfies GeneratedQuestion;
  });
}

export async function validateBatch(
  questions: GeneratedQuestion[],
  content: string
): Promise<BatchValidationResult | null> {
  const contextPrompt = PromptArchitect.buildContext(
    PromptArchitect.cleanReferenceImages(content)
  );
  const taskPrompt = buildBatchValidationPrompt(questions);
  const aiConfig = getTaskConfig('validation');

  const messages = PromptArchitect.assemble(
    aiConfig.systemPromptPrefix
      ? aiConfig.systemPromptPrefix + '\n' + VALIDATION_SYSTEM_PROMPT
      : VALIDATION_SYSTEM_PROMPT,
    contextPrompt,
    taskPrompt
  );

  const result = await StructuredGenerator.generate(messages, {
    schema: BatchValidationResultSchema,
    task: 'validation',
  });

  if (result) {
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

  const result = await StructuredGenerator.generate(messages, {
    schema: GeneratedQuestionSchema,
    task: 'revision',
  });

  if (result) {
    return {
      ...result,
      bloomLevel: originalQuestion.bloomLevel,
      img: originalQuestion.img,
      concept: originalQuestion.concept,
      insight: (result.insight ?? undefined) as string | undefined, // Explicit cast to satisfy strict type if needed
    } satisfies GeneratedQuestion;
  }

  return null;
}

// === SECTION === Orchestration

// --- Sub-steps for Orchestration ---

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

  const existingConcepts: ConceptMapItem[] =
    (aiLogic.concept_map as ConceptMapItem[]) || [];
  const isCacheValid = existingConcepts.length > 0 && !aiLogic.invalidated_at;

  if (isCacheValid) {
    log('MAPPING', 'Önceden oluşturulmuş kavram haritası yükleniyor...');
    return {
      concepts: existingConcepts,
      difficultyIndex: aiLogic.difficulty_index || 3,
    };
  }

  log('MAPPING', 'Konunun kritik noktaları belirleniyor...');
  const strategy = getSubjectStrategy(chunk.course_name || '');
  const analysisResult = await runChunkAnalysis({
    content: chunk.content,
    courseName: chunk.course_name || '',
    sectionTitle: chunk.section_title || '',
    importance: strategy?.importance || 'medium',
  });

  if (!analysisResult) {
    throw new Error(
      'Kavram haritası oluşturulamadı. Sistem yoğun olabilir, lütfen tekrar deneyin.'
    );
  }

  const updatedAILogic = {
    ...(typeof chunk.ai_logic === 'object'
      ? (chunk.ai_logic as Record<string, Json>)
      : {}),
    concept_map: analysisResult.concepts as Json,
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
    parserLogger.error('Failed to update ai_logic with concepts', {
      error: analysisUpdateError,
    });
  }

  return {
    concepts: analysisResult.concepts,
    difficultyIndex: analysisResult.difficulty_index,
  };
}

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
    suggested_quotas: quotas,
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
    parserLogger.error('Failed to update ai_logic with quotas', {
      error: quotaUpdateError,
    });
  }

  return quotas;
}

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
    await Repository.updateChunkStatus(chunkId, 'PROCESSING');
    const rawChunk = await Repository.getChunkWithContent(chunkId);
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
      guidelines
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
        const cached = await Repository.fetchCachedQuestion(
          chunk.id,
          type,
          concept.baslik
        );

        if (cached) {
          totalGeneratedCount++;
          callbacks.onQuestionSaved(totalGeneratedCount);
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
              const { error: saveErr } = await Repository.createQuestion({
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
                },
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

    await Repository.updateChunkStatus(chunkId, 'COMPLETED');
    log('COMPLETED', 'Tüm işlemler başarıyla tamamlandı!');
    callbacks.onComplete({ success: true, generated: totalGeneratedCount });
  } catch (e: unknown) {
    const error = e as Error;
    parserLogger.error('Generation Error:', error);
    log('ERROR', `Hata oluştu: ${error.message}`);
    callbacks.onError(error.message || 'Error occurred during generation.');
    await Repository.updateChunkStatus(chunkId, 'FAILED');
  }
}
