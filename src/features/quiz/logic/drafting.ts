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

  const firstConcept = input.concepts[0];
  const strategy = determineNodeStrategy(
    firstConcept.index,
    firstConcept.concept,
    input.courseName
  );
  if (!strategy) return null;

  const taskPrompt = PromptArchitect.draftingPrompt(
    input.concepts.map((conceptEntry) => conceptEntry.concept),
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
      `\n\nBu istekte ${input.concepts.length} kavram var. Her kavram için ayrı bir soru üret ve hepsini tek bir JSON objesi içinde döndür:\n{"questions": [{soru1}, {soru2}, ...]}`
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
    const inputConcept = input.concepts[index] || input.concepts[0];
    const itemStrategy = determineNodeStrategy(
      inputConcept.index,
      inputConcept.concept,
      input.courseName
    );

    return {
      ...generatedQuestion,
      bloomLevel: itemStrategy?.bloomLevel || 'knowledge',
      img: generatedQuestion.img ?? null,
      concept: inputConcept.concept.baslik,
      insight: generatedQuestion.insight ?? undefined,
    } satisfies GeneratedQuestion;
  });
}
