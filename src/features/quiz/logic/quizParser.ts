import { type Json } from '@/types/database.types';
import {
  AILogicSchema,
  BatchGeneratedQuestionSchema,
  BatchValidationResult,
  BatchValidationResultSchema,
  type ConceptMapItem,
  ConceptMapResponseSchema,
  type GeneratedQuestion,
  GeneratedQuestionSchema,
  type GeneratorCallbacks,
  type ValidationResult,
  ValidationResultSchema,
} from '@/features/quiz/types';
import {
  buildAnalysisPrompt,
  buildBatchValidationPrompt,
  buildDraftingPrompt,
  buildValidationPrompt,
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
import { determineNodeStrategy, getSubjectStrategy } from './srsLogic';
import { calculateQuotas } from './quizCoreLogic';
import { shuffle } from '../utils/mathUtils';

const parserLogger = logger.withPrefix('[ParserLogic]');

// FALLBACK_QUESTION removed based on audit recommendation.
// Revision failures will now return null and be skipped.

// --- LLM Response Parsing Utilities (formerly in parserUtils) ---

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

// --- Content Analysis & Generation Logic (formerly in parserLogic) ---

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
  });
}

export async function draftQuestion(input: {
  concept: ConceptMapItem;
  index: number;
  courseName: string;
  usageType: 'antrenman' | 'deneme' | 'arsiv';
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
  } as GeneratedQuestion;
}

export async function draftBatch(input: {
  concepts: { concept: ConceptMapItem; index: number }[];
  courseName: string;
  usageType: 'antrenman' | 'deneme' | 'arsiv';
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
    } as GeneratedQuestion;
  });
}

export async function validateQuestion(
  question: GeneratedQuestion,
  content: string
): Promise<ValidationResult | null> {
  const contextPrompt = PromptArchitect.buildContext(
    PromptArchitect.cleanReferenceImages(content)
  );
  const taskPrompt = buildValidationPrompt(question);
  const aiConfig = getTaskConfig('validation');

  const messages = PromptArchitect.assemble(
    aiConfig.systemPromptPrefix
      ? aiConfig.systemPromptPrefix + '\n' + VALIDATION_SYSTEM_PROMPT
      : VALIDATION_SYSTEM_PROMPT,
    contextPrompt,
    taskPrompt
  );

  const result = await StructuredGenerator.generate(messages, {
    schema: ValidationResultSchema,
    task: 'validation',
  });

  if (result) {
    if (result.total_score >= 70 && result.decision === 'REJECTED') {
      result.decision = 'APPROVED';
    } else if (result.total_score < 70 && result.decision === 'APPROVED') {
      result.decision = 'REJECTED';
    }
    return result;
  }
  return null;
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
    originalQuestion,
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
    } as GeneratedQuestion;
  }

  return null;
}

export async function generateForChunk(
  chunkId: string,
  callbacks: GeneratorCallbacks,
  options: {
    targetCount?: number;
    usageType?: 'antrenman' | 'arsiv' | 'deneme';
    userId?: string;
  } = {}
) {
  const log = (
    step:
      | 'INIT'
      | 'MAPPING'
      | 'GENERATING'
      | 'VALIDATING'
      | 'REVISION'
      | 'SAVING'
      | 'COMPLETED'
      | 'ERROR',
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
    const chunk = await Repository.getChunkWithContent(chunkId);
    if (!chunk) throw new Error('Chunk not found');

    const aiLogic = isValid(AILogicSchema, chunk.ai_logic)
      ? parseOrThrow(AILogicSchema, chunk.ai_logic)
      : {};

    const existingConcepts: ConceptMapItem[] =
      (aiLogic.concept_map as ConceptMapItem[]) || [];

    // CACHE CONTROL: Skip analysis if we have valid concepts and it's not invalidated
    const isCacheValid = existingConcepts.length > 0 && !aiLogic.invalidated_at;

    let concepts: ConceptMapItem[] = existingConcepts;
    let difficultyIndex = aiLogic.difficulty_index || 3;

    if (!isCacheValid) {
      log('MAPPING', 'Konunun kritik noktaları belirleniyor...');
      const strategy = getSubjectStrategy((chunk.course_name as string) || '');
      const analysisResult = await runChunkAnalysis({
        content: chunk.content as string,
        courseName: (chunk.course_name as string) || '',
        sectionTitle: (chunk.section_title as string) || '',
        importance: strategy?.importance || 'medium',
      });

      if (!analysisResult) {
        throw new Error('Sistem yoğun, lütfen biraz sonra tekrar deneyin.');
      }
      concepts = analysisResult.concepts;
      difficultyIndex = analysisResult.difficulty_index;

      await Repository.updateChunkAILogic(chunkId, {
        ...((chunk.ai_logic || {}) as Record<string, unknown>),
        concept_map: concepts as Json,
        difficulty_index: difficultyIndex,
        generated_at: new Date().toISOString(),
        invalidated_at: null, // Reset invalidation
      } as Record<string, Json>);
    } else {
      log('MAPPING', 'Önceden oluşturulmuş kavram haritası yükleniyor...');
    }

    const quotas = calculateQuotas(concepts);
    await Repository.updateChunkAILogic(chunkId, {
      ...((chunk.ai_logic || {}) as Record<string, unknown>),
      suggested_quotas: quotas,
      reasoning: 'Otomatik pedagojik kotalar.',
    } as Record<string, Json>);

    const usageTypes: ('antrenman' | 'deneme' | 'arsiv')[] = options.usageType
      ? [options.usageType]
      : ['antrenman', 'deneme', 'arsiv'];
    const totalTarget =
      options.targetCount ||
      usageTypes.reduce(
        (acc, type) => acc + (quotas[type as keyof typeof quotas] || 0),
        0
      );
    callbacks.onTotalTargetCalculated(totalTarget);

    const guidelines = await getSubjectGuidelines(
      (chunk.course_name as string) || ''
    );
    const cleanContent = PromptArchitect.cleanReferenceImages(
      chunk.content as string
    );
    const sharedContext = PromptArchitect.buildContext(
      cleanContent,
      (chunk.course_name as string) || '',
      (chunk.section_title as string) || '',
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

      // --- NEW BATCHING LOGIC START ---
      let draftingBuffer: {
        index: number;
        concept: ConceptMapItem;
      }[] = [];
      const BATCH_SIZE = 3;

      for (
        let i = 0;
        i < targetConcepts.length && totalGeneratedCount < totalTarget;
        i++
      ) {
        const concept = targetConcepts[i];

        const cached = await Repository.fetchCachedQuestion(
          chunk.id as string,
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
            courseName: (chunk.course_name as string) || '',
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
              if (!bufferItem) continue; // Safety check if LLM returned more questions than concepts

              let question = draftedBatchResult[j];
              const validation = validationResponse?.results.find(
                (r: BatchValidationResult['results'][number]) => r.index === j
              );

              if (!validation || validation.decision === 'REJECTED') {
                log(
                  'REVISION',
                  `${bufferItem.concept.baslik} sorusu için revizyon yapılıyor...`
                );
                // Max retries for batches will be implicitly 1 via individual reviseQuestion call
                const revised = await reviseQuestion(
                  question,
                  validation || {
                    index: j,
                    total_score: 0,
                    decision: 'REJECTED',
                    critical_faults: ['Batch validation error'],
                    improvement_suggestion:
                      'Soru formatı tamamen hatalı, lütfen yönergelere uyarak tekrar yazın',
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
                chunk_id: chunk.id as string,
                course_id: chunk.course_id as string,
                section_title: chunk.section_title as string,
                usage_type: type,
                bloom_level: (question.bloomLevel || 'knowledge') as
                  | 'knowledge'
                  | 'analysis'
                  | 'application'
                  | null
                  | undefined,
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
