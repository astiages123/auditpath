import { z } from 'zod';
import { getTaskConfig } from '@/utils/aiConfig';
import {
  type GeneratedQuestion,
  GeneratedQuestionSchema,
  type ValidationResult,
} from '../types';
import { GLOBAL_AI_SYSTEM_PROMPT, PromptArchitect } from './prompts';
import { generate } from './structuredGenerator';

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

  if (!result) return null;

  return {
    ...result,
    bloomLevel: originalQuestion.bloomLevel,
    img: originalQuestion.img,
    concept: originalQuestion.concept,
    insight: result.insight ?? undefined,
  } satisfies GeneratedQuestion;
}
