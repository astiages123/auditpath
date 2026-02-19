import { type Json } from '@/types/database.types';
import {
  ChunkMetadataSchema,
  type ConceptMapItem,
  ConceptMapResponseSchema,
  type GeneratedQuestion,
  GeneratedQuestionSchema,
  type GeneratorCallbacks,
  type ValidationResult,
  ValidationResultSchema,
} from '@/features/quiz/types';
import {
  ANALYSIS_SYSTEM_PROMPT,
  buildDraftingTaskPrompt,
  buildValidationTaskPrompt,
  GLOBAL_AI_SYSTEM_PROMPT,
  VALIDATION_SYSTEM_PROMPT,
} from '@/features/quiz/logic/prompts';
import { PromptArchitect } from '@/features/quiz/logic/promptArchitect';
import { StructuredGenerator } from '@/features/quiz/logic/structuredGenerator';
import { getAIConfig } from '@/utils/aiConfig';
import { isValid, parseOrThrow } from '@/utils/validation';
import { logger } from '@/utils/logger';
import { getSubjectGuidelines } from '@/features/quiz/services/subjectKnowledgeService';
import * as Repository from '@/features/quiz/services/quizService';
import { determineNodeStrategy, getSubjectStrategy } from './srsLogic';
import { calculateQuotas } from './scoringLogic';

const parserLogger = logger.withPrefix('[ParserLogic]');

const FALLBACK_QUESTION: Omit<GeneratedQuestion, 'concept'> = {
  q: 'Bu konuyla ilgili bir soru şu an hazırlanamadı. Lütfen materyali tekrar gözden geçir.',
  o: ['Devam et', 'Tekrar dene', 'Atla', 'Bitti', 'Yardım'],
  a: 0,
  exp: 'Sistem yoğunluğu nedeniyle geçici bir durum oluştu.',
  bloomLevel: 'knowledge',
  evidence: 'Sistem mesajı',
  diagnosis: 'Generation failure fallback',
  insight: 'Generic backup',
};

export async function runChunkAnalysis(input: {
  content: string;
  courseName: string;
  sectionTitle: string;
  importance: 'high' | 'medium' | 'low';
}) {
  const systemPrompt = ANALYSIS_SYSTEM_PROMPT(
    input.sectionTitle,
    input.courseName,
    input.importance
  );
  const contextPrompt = PromptArchitect.buildContext(
    PromptArchitect.cleanReferenceImages(input.content)
  );
  const aiConfig = getAIConfig();

  const messages = PromptArchitect.assemble(
    aiConfig.systemPromptPrefix
      ? aiConfig.systemPromptPrefix + '\n' + systemPrompt
      : systemPrompt,
    contextPrompt,
    `Ders Önem Derecesi: ${input.importance}\nLütfen kavram haritasını ve bilişsel zorluk endeksini oluştur. JSON formatında çıktı ver.`
  );

  return await StructuredGenerator.generate(messages, {
    schema: ConceptMapResponseSchema,
    provider: aiConfig.provider,
    model: aiConfig.model,
    usageType: 'analysis',
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
  const taskPrompt = buildDraftingTaskPrompt(
    input.concept,
    strategy,
    input.usageType
  );
  const aiConfig = getAIConfig();

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
    provider: aiConfig.provider,
    model: aiConfig.model,
    usageType: 'drafting',
  });

  if (!result) return null;

  return {
    ...result,
    bloomLevel: strategy.bloomLevel,
    img: result.img ?? null,
    concept: input.concept.baslik,
  } as GeneratedQuestion;
}

export async function validateQuestion(
  question: GeneratedQuestion,
  content: string
): Promise<ValidationResult | null> {
  const contextPrompt = PromptArchitect.buildContext(
    PromptArchitect.cleanReferenceImages(content)
  );
  const taskPrompt = buildValidationTaskPrompt(question);
  const aiConfig = getAIConfig();

  const messages = PromptArchitect.assemble(
    aiConfig.systemPromptPrefix
      ? aiConfig.systemPromptPrefix + '\n' + VALIDATION_SYSTEM_PROMPT
      : VALIDATION_SYSTEM_PROMPT,
    contextPrompt,
    taskPrompt
  );

  const result = await StructuredGenerator.generate(messages, {
    schema: ValidationResultSchema,
    provider: aiConfig.provider,
    model: aiConfig.model,
    usageType: 'validation',
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

export async function reviseQuestion(
  originalQuestion: GeneratedQuestion,
  validationResult: ValidationResult,
  sharedContextPrompt: string
): Promise<GeneratedQuestion> {
  const revisionTask = `Aşağıdaki soru REDDEDİLMİŞTİR. Lütfen revize et.\n\n## REDDEDİLEN SORU:\n${JSON.stringify(
    originalQuestion,
    null,
    2
  )}\n\n## KRİTİK HATALAR:\n${validationResult.critical_faults.join(
    '\n'
  )}\n\n## ÖNERİ:\n${validationResult.improvement_suggestion}`;
  const aiConfig = getAIConfig();

  const messages = PromptArchitect.assemble(
    aiConfig.systemPromptPrefix
      ? aiConfig.systemPromptPrefix + '\n' + GLOBAL_AI_SYSTEM_PROMPT
      : GLOBAL_AI_SYSTEM_PROMPT,
    sharedContextPrompt,
    revisionTask
  );

  const result = await StructuredGenerator.generate(messages, {
    schema: GeneratedQuestionSchema,
    provider: aiConfig.provider,
    model: aiConfig.model,
    usageType: 'revision',
  });

  if (result) {
    return {
      ...result,
      bloomLevel: originalQuestion.bloomLevel,
      img: originalQuestion.img,
      concept: originalQuestion.concept,
    } as GeneratedQuestion;
  }

  return {
    ...FALLBACK_QUESTION,
    concept: originalQuestion.concept,
  } as GeneratedQuestion;
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

    const metadata = isValid(ChunkMetadataSchema, chunk.metadata)
      ? parseOrThrow(ChunkMetadataSchema, chunk.metadata)
      : {};
    let concepts: ConceptMapItem[] =
      (metadata.concept_map as ConceptMapItem[]) || [];
    let difficultyIndex = metadata.difficulty_index || 3;

    if (concepts.length === 0) {
      log('MAPPING', 'Konunun kritik noktaları belirleniyor...');
      const strategy = getSubjectStrategy((chunk.course_name as string) || '');
      const analysisResult = await runChunkAnalysis({
        content: (chunk.display_content as string) || (chunk.content as string),
        courseName: (chunk.course_name as string) || '',
        sectionTitle: (chunk.section_title as string) || '',
        importance: strategy?.importance || 'medium',
      });

      if (!analysisResult) {
        throw new Error('Sistem yoğun, lütfen biraz sonra tekrar deneyin.');
      }
      concepts = analysisResult.concepts;
      difficultyIndex = analysisResult.difficulty_index;

      await Repository.updateChunkMetadata(chunkId, {
        ...((chunk.metadata || {}) as Record<string, unknown>),
        concept_map: concepts as Json,
        difficulty_index: difficultyIndex,
      });
    }

    const quotas = calculateQuotas(concepts);
    await Repository.updateChunkAILogic(chunkId, {
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
      (chunk.display_content as string) || (chunk.content as string)
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
          : [...concepts].sort(() => 0.5 - Math.random()).slice(0, typeQuotas);

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

        let question = await draftQuestion({
          concept,
          index: i,
          courseName: (chunk.course_name as string) || '',
          usageType: type,
          sharedContextPrompt: sharedContext,
        });
        if (!question) continue;

        const validation = await validateQuestion(question, cleanContent);
        if (validation?.decision === 'REJECTED') {
          question = await reviseQuestion(question, validation, sharedContext);
        }

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
          concept_title: concept.baslik,
        });

        if (!saveErr) {
          totalGeneratedCount++;
          callbacks.onQuestionSaved(totalGeneratedCount);
        }
      }
    }

    await Repository.updateChunkStatus(chunkId, 'COMPLETED');
    callbacks.onComplete({ success: true, generated: totalGeneratedCount });
  } catch (e: unknown) {
    const error = e as Error;
    parserLogger.error('Generation Error:', error);
    callbacks.onError(error.message || 'Error occurred during generation.');
    await Repository.updateChunkStatus(chunkId, 'FAILED');
  }
}
