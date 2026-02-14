import { ConceptMapItem, GeneratedQuestion } from '@/features/quiz/core/types';
import { GeneratedQuestionSchema } from '../schemas';
import { buildDraftingTaskPrompt, GLOBAL_AI_SYSTEM_PROMPT } from '../prompts';
import { PromptArchitect, StructuredGenerator } from '../utils';
import { determineNodeStrategy } from '@/features/quiz/lib/engine/strategy';
import { BaseTask, TaskContext, TaskResult } from './base-task';

export interface DraftingTaskInput {
  concept: ConceptMapItem;
  index: number;
  courseName: string;
  usageType?: 'antrenman' | 'deneme' | 'arsiv';
  previousDiagnoses?: string[];
  sharedContextPrompt: string;
}

export class DraftingTask extends BaseTask<
  DraftingTaskInput,
  GeneratedQuestion
> {
  async run(
    input: DraftingTaskInput,
    context?: TaskContext
  ): Promise<TaskResult<GeneratedQuestion>> {
    const {
      concept,
      index,
      courseName,
      usageType = 'antrenman',
      previousDiagnoses,
      sharedContextPrompt,
    } = input;

    const strategy = determineNodeStrategy(index, concept, courseName);
    this.log(context, `Drafting Question for: ${concept.baslik}`, {
      strategy: strategy.bloomLevel,
    });

    const taskPrompt = buildDraftingTaskPrompt(
      concept,
      strategy,
      usageType,
      previousDiagnoses
    );

    const messages = PromptArchitect.assemble(
      GLOBAL_AI_SYSTEM_PROMPT,
      sharedContextPrompt,
      taskPrompt
    );

    const result = await StructuredGenerator.generate(messages, {
      schema: GeneratedQuestionSchema,
      provider: 'mimo',
      temperature: 0.1,
      usageType: 'drafting',
      onLog: (msg: string, details?: Record<string, unknown>) =>
        this.log(context, msg, details),
    });

    if (result) {
      const question: GeneratedQuestion = {
        ...result,
        bloomLevel: strategy.bloomLevel,
        img: result.img ?? null,
        concept: concept.baslik,
      };
      return { success: true, data: question };
    }

    return { success: false, error: 'Failed to generate question' };
  }
}
