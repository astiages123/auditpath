import { ConceptMapResult } from '@/features/quiz/core/types';
import { ConceptMapResponseSchema } from '../schemas';
import { ANALYSIS_SYSTEM_PROMPT } from '../prompts';
import { PromptArchitect, StructuredGenerator } from '../utils';
import { BaseTask, TaskContext, TaskResult } from './base-task';

export interface AnalysisTaskInput {
  content: string;
  courseName: string;
  sectionTitle: string;
  importance: 'high' | 'medium' | 'low';
}

export class AnalysisTask extends BaseTask<
  AnalysisTaskInput,
  ConceptMapResult
> {
  async run(
    input: AnalysisTaskInput,
    context?: TaskContext
  ): Promise<TaskResult<ConceptMapResult>> {
    this.log(context, 'Bilişsel Analiz Yapılıyor (Öğrenme Doygunluğu)', {
      course: input.courseName,
      section: input.sectionTitle,
      importance: input.importance,
    });

    const systemPrompt = ANALYSIS_SYSTEM_PROMPT(
      input.sectionTitle,
      input.courseName,
      input.importance
    );

    const contextPrompt = PromptArchitect.buildContext(
      PromptArchitect.cleanReferenceImages(input.content)
    );

    const messages = PromptArchitect.assemble(
      systemPrompt,
      contextPrompt,
      `Ders Önem Derecesi: ${input.importance}\nLütfen kavram haritasını, bilişsel zorluk endeksini ve ideal öğrenme kotalarını oluştur. JSON formatında çıktı ver.`
    );

    const result = await StructuredGenerator.generate(messages, {
      schema: ConceptMapResponseSchema,
      provider: 'google',
      model: 'gemini-2.5-flash',
      usageType: 'analysis',
      maxTokens: 8192,
      onLog: (msg: string, details?: Record<string, unknown>) => {
        this.log(context, msg, details);
        if (msg.includes('Bilişsel analiz ve kotalar başarıyla kaydedildi')) {
          // This allows potential listeners to know mapping is done
        }
      },
    });

    if (result) return { success: true, data: result };
    return { success: false, error: 'Failed to generate concept map' };
  }
}
