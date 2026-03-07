import { z } from 'zod';
import { getTaskConfig } from '@/utils/aiConfig';
import {
  BatchGeneratedQuestionSchema,
  type ConceptMapItem,
  type GeneratedQuestion,
  GeneratedQuestionSchema,
} from '../types';
import { GLOBAL_AI_SYSTEM_PROMPT, PromptArchitect } from './prompts';
import { generate } from './structuredGenerator';
import { determineNodeStrategy } from './quizParserStrategy';

type DraftQuestionInput = {
  concept: ConceptMapItem;
  index: number;
  courseName: string;
  usageType: 'antrenman' | 'deneme';
  sharedContextPrompt: string;
};

type DraftBatchInput = {
  concepts: { concept: ConceptMapItem; index: number }[];
  courseName: string;
  usageType: 'antrenman' | 'deneme';
  sharedContextPrompt: string;
};

type ResolvedConceptStrategy = {
  conceptEntry: { concept: ConceptMapItem; index: number };
  strategy: NonNullable<ReturnType<typeof determineNodeStrategy>>;
};

/**
 * Belirli bir kavram için soru tasarlar.
 */
export async function draftQuestion(input: DraftQuestionInput) {
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
    taskPrompt
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
export async function draftBatch(
  input: DraftBatchInput
): Promise<GeneratedQuestion[] | null> {
  if (input.concepts.length === 0) return [];

  const strategies: ResolvedConceptStrategy[] = input.concepts
    .map((conceptEntry) => ({
      conceptEntry,
      strategy: determineNodeStrategy(
        conceptEntry.index,
        conceptEntry.concept,
        input.courseName
      ),
    }))
    .filter((item): item is ResolvedConceptStrategy => item.strategy !== null);

  if (strategies.length === 0) return null;

  const fallbackStrategy = strategies[0].strategy;

  const taskPrompt = PromptArchitect.draftingPrompt(
    strategies.map((item) => item.conceptEntry.concept),
    fallbackStrategy,
    input.usageType,
    undefined,
    input.courseName,
    strategies.map((item) => ({
      baslik: item.conceptEntry.concept.baslik,
      bloomLevel: item.strategy.bloomLevel,
      instruction: item.strategy.instruction,
      focus: item.conceptEntry.concept.odak,
    }))
  );
  const aiConfig = getTaskConfig('drafting');

  const messages = PromptArchitect.assemble(
    aiConfig.systemPromptPrefix
      ? aiConfig.systemPromptPrefix + '\n' + GLOBAL_AI_SYSTEM_PROMPT
      : GLOBAL_AI_SYSTEM_PROMPT,
    input.sharedContextPrompt,
    taskPrompt +
      `\n\nBu istekte ${strategies.length} kavram var. Her kavram için ayrı bir soru üret ve hepsini tek bir JSON objesi içinde döndür. Sıra korunmalı:\n{"questions": [{soru1}, {soru2}, ...]}`
  );

  const result = await generate<z.infer<typeof BatchGeneratedQuestionSchema>>(
    messages,
    {
      schema: BatchGeneratedQuestionSchema,
      task: 'drafting',
    }
  );

  if (!result) return null;

  return result.questions.map((generatedQuestion, index) => {
    const strategyEntry = strategies[index] || strategies[0];

    return {
      ...generatedQuestion,
      bloomLevel: strategyEntry.strategy.bloomLevel,
      img: generatedQuestion.img ?? null,
      concept: strategyEntry.conceptEntry.concept.baslik,
      insight: generatedQuestion.insight ?? undefined,
    } satisfies GeneratedQuestion;
  });
}
