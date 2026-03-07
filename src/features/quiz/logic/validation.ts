import { z } from 'zod';
import { getTaskConfig } from '@/utils/aiConfig';
import { BatchValidationResultSchema, type GeneratedQuestion } from '../types';
import { PromptArchitect, VALIDATION_SYSTEM_PROMPT } from './prompts';
import { generate } from './structuredGenerator';

/**
 * Üretilen soruları doğrular.
 */
export async function validateBatch(
  questions: GeneratedQuestion[],
  content: string,
  courseName?: string,
  sectionTitle?: string
): Promise<z.infer<typeof BatchValidationResultSchema> | null> {
  const contextPrompt = PromptArchitect.buildContext(
    PromptArchitect.cleanReferenceImages(content).slice(0, 4000),
    courseName,
    sectionTitle
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
      // Mesaj uzunluklarını kod seviyesinde de sınırlayarak token tasarrufu ve UI tutarlılığı sağlıyoruz
      r.critical_faults = r.critical_faults.map((f) => f.slice(0, 150));
      r.improvement_suggestion = r.improvement_suggestion.slice(0, 150);

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
