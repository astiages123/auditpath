import { ConceptMapResult } from '../types';
import { ConceptMapResponseSchema } from '../schemas';
import { ANALYSIS_SYSTEM_PROMPT } from '../prompts';
import { PromptArchitect, StructuredGenerator } from '../utils';
import { BaseTask, TaskContext, TaskResult } from './base-task';

export interface AnalysisTaskInput {
  content: string;
  courseName: string;
  sectionTitle: string;
}

export class AnalysisTask extends BaseTask<
  AnalysisTaskInput,
  ConceptMapResult
> {
  async run(
    input: AnalysisTaskInput,
    context?: TaskContext
  ): Promise<TaskResult<ConceptMapResult>> {
    this.log(context, 'Kavram haritası çıkarılıyor (Yoğunluk Odaklı)', {
      course: input.courseName,
      section: input.sectionTitle,
    });

    const systemPrompt = ANALYSIS_SYSTEM_PROMPT(
      input.sectionTitle,
      input.courseName
    );

    const contextPrompt = PromptArchitect.buildContext(
      PromptArchitect.cleanReferenceImages(input.content)
    );

    const messages = PromptArchitect.assemble(
      systemPrompt,
      contextPrompt,
      `Lütfen kavram haritasını ve yoğunluk skorunu oluştur. JSON formatında çıktı ver.`
    );

    const result = await StructuredGenerator.generate(messages, {
      schema: ConceptMapResponseSchema,
      provider: 'google',
      model: 'gemini-2.5-flash',
      usageType: 'analysis',
      onLog: (msg: string, details?: Record<string, unknown>) =>
        this.log(context, msg, details),
    });

    if (result) return { success: true, data: result };
    return { success: false, error: 'Failed to generate concept map' };
  }
}
