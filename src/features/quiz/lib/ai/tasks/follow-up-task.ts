import { GeneratedQuestion } from '@/features/quiz/core/types';
import { GeneratedQuestionSchema } from '../schemas';
import { buildFollowUpTaskPrompt, GLOBAL_AI_SYSTEM_PROMPT } from '../prompts';
import { PromptArchitect, StructuredGenerator } from '../utils';
import * as Repository from '@/features/quiz/api/repository';
import { BaseTask, TaskContext, TaskResult } from './base-task';

export interface WrongAnswerContext {
  chunkId: string;
  originalQuestion: {
    id: string;
    q: string;
    o: string[];
    a: number;
    exp: string;
    evidence: string;
    img?: number | null;
    bloomLevel?: string;
    concept: string;
  };
  incorrectOptionIndex: number;
  correctOptionIndex: number;
  courseId: string;
  userId: string;
}

export interface FollowUpTaskInput {
  context: WrongAnswerContext;
  evidence: string;
  chunkContent: string;
  courseName: string;
  sectionTitle: string;
  guidelines: {
    instruction?: string | undefined;
    few_shot_example?: unknown;
    bad_few_shot_example?: unknown;
  };
}

export class FollowUpTask extends BaseTask<
  FollowUpTaskInput,
  GeneratedQuestion
> {
  async run(
    input: FollowUpTaskInput,
    context?: TaskContext
  ): Promise<TaskResult<GeneratedQuestion>> {
    const { id: originalId, bloomLevel: originalBloom } =
      input.context.originalQuestion;
    const { userId, chunkId } = input.context;
    const { evidence, chunkContent, courseName, sectionTitle, guidelines } =
      input;

    this.log(context, 'Generating Follow-up question...');

    const statusData = await Repository.getUserQuestionStatus(
      userId,
      originalId
    );

    const consecutiveFails = statusData?.consecutive_fails ?? 0;
    let targetBloomLevel = (originalBloom || 'application') as
      | 'knowledge'
      | 'application'
      | 'analysis';
    let scaffoldingNote = '';

    if (consecutiveFails >= 2) {
      if (targetBloomLevel === 'analysis') {
        targetBloomLevel = 'application';
      } else if (targetBloomLevel === 'application') {
        targetBloomLevel = 'knowledge';
      }
      scaffoldingNote = `\n**SCAFFOLDING AKTİF**: Kullanıcı bu konuda zorlanıyor (Hata #${consecutiveFails}). Soruyu BİR ALT BİLİŞSEL SEVİYEYE (${targetBloomLevel}) indir.`;
    }

    const previousDiagnoses = await Repository.getRecentDiagnoses(
      userId,
      chunkId,
      3
    );

    const contextPrompt = PromptArchitect.buildContext(
      PromptArchitect.cleanReferenceImages(chunkContent),
      courseName,
      sectionTitle,
      guidelines
    );

    const originalQuestionJson = {
      q: input.context.originalQuestion.q,
      o: input.context.originalQuestion.o,
      a: input.context.originalQuestion.a,
      exp: input.context.originalQuestion.exp,
      img: input.context.originalQuestion.img ?? null,
    };

    const taskPrompt = buildFollowUpTaskPrompt(
      evidence,
      originalQuestionJson,
      input.context.incorrectOptionIndex,
      input.context.correctOptionIndex,
      targetBloomLevel,
      scaffoldingNote,
      previousDiagnoses
    );

    const messages = PromptArchitect.assemble(
      GLOBAL_AI_SYSTEM_PROMPT,
      contextPrompt,
      taskPrompt
    );

    const result = await StructuredGenerator.generate(messages, {
      schema: GeneratedQuestionSchema,
      provider: 'mimo',
      temperature: 0.1,
      onLog: (msg: string, details?: Record<string, unknown>) =>
        this.log(context, msg, details),
    });

    if (result) {
      return {
        success: true,
        data: {
          ...result,
          bloomLevel: targetBloomLevel,
          img: input.context.originalQuestion.img ?? null,
          concept: input.context.originalQuestion.concept,
        },
      };
    }

    return { success: false, error: 'Follow-up generation failed' };
  }
}
