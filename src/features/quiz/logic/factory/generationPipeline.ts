import * as Repository from '@/features/quiz/services/repositories/quizRepository';
import { type ConceptMapItem } from '@/features/quiz/types';
import { type Quotas } from './quotaLogic';
import {
  type GenerationStep,
  type GeneratorCallbacks,
} from '@/features/quiz/types/quizEngineSchemas';
import { ValidationTask } from '@/features/quiz/logic/tasks/ValidationTask';
import { RevisionTask } from '@/features/quiz/logic/tasks/RevisionTask';

// Re-import drafting task from the correct source since QuizFactory used DraftingTask
import { DraftingTask } from '@/features/quiz/logic/tasks/DraftingTask';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GenerationPipeline {
  private draftingTask = new DraftingTask();
  private validationTask = new ValidationTask();
  private revisionTask = new RevisionTask();

  constructor(
    private log: (
      step: GenerationStep,
      msg: string,
      details?: Record<string, unknown>
    ) => void,
    private callbacks: GeneratorCallbacks
  ) {}

  async run(
    chunk: {
      id: string;
      course_name: string;
      course_id: string;
      section_title: string;
    },
    concepts: ConceptMapItem[],
    quotas: Quotas,
    sharedContext: string,
    cleanContent: string,
    options: {
      targetCount?: number;
      usageType?: 'antrenman' | 'arsiv' | 'deneme';
    }
  ): Promise<number> {
    const usageTypes: ('antrenman' | 'deneme' | 'arsiv')[] = options.usageType
      ? [options.usageType]
      : ['antrenman', 'deneme', 'arsiv'];

    let totalGeneratedCount = 0;

    for (const currentUsageType of usageTypes) {
      let targetConcepts = concepts;
      let targetTotal = quotas[currentUsageType] || concepts.length;

      if (currentUsageType !== 'antrenman') {
        targetConcepts = [...concepts]
          .sort(() => 0.5 - Math.random())
          .slice(0, targetTotal);
      }

      if (options.usageType && options.targetCount) {
        targetTotal = options.targetCount;
      }

      this.log(
        'GENERATING',
        'Sizin için yeni bir öğrenme serüveni hazırlıyoruz...',
        { target: targetTotal }
      );

      let typeGeneratedCount = 0;

      for (let i = 0; i < targetConcepts.length; i++) {
        if (typeGeneratedCount >= targetTotal) break;

        const concept = targetConcepts[i];
        this.log(
          'GENERATING',
          `${concept.baslik} konusu üzerinde çalışılıyor...`,
          { index: i + 1 }
        );

        const cached = await Repository.fetchCachedQuestion(
          chunk.id,
          currentUsageType,
          concept.baslik
        );

        if (cached) {
          this.log(
            'SAVING',
            'Bu soru kütüphanenizde zaten mevcut, atlanıyor.',
            {
              concept: concept.baslik,
              type: currentUsageType,
            }
          );
          typeGeneratedCount++;
          totalGeneratedCount++;
          this.callbacks.onQuestionSaved(totalGeneratedCount);
          continue;
        }

        let draftRes;
        let draftAttempts = 0;
        const maxDraftAttempts = 2;

        while (draftAttempts < maxDraftAttempts) {
          draftRes = await this.draftingTask.run(
            {
              concept,
              index: i,
              courseName: chunk.course_name,
              usageType: currentUsageType,
              sharedContextPrompt: sharedContext,
            },
            {
              logger: (msg, d) => this.log('GENERATING', msg, d),
            }
          );

          if (draftRes.success && draftRes.data) break;

          draftAttempts++;
          if (draftAttempts < maxDraftAttempts) {
            this.log(
              'GENERATING',
              'Model şu an yoğun, 5 saniye içinde tekrar denenecek...',
              { concept: concept.baslik, attempt: draftAttempts }
            );
            await sleep(5000);
          }
        }

        if (!draftRes || !draftRes.success || !draftRes.data) {
          this.log(
            'ERROR',
            `${concept.baslik} için soru oluşturulamadı, atlanıyor.`,
            { concept: concept.baslik }
          );
          continue;
        }

        let question = draftRes.data;

        // Validation & Revision Loop
        let validRes = await this.validationTask.run(
          { question, content: cleanContent },
          { logger: (msg, d) => this.log('VALIDATING', msg, d) }
        );

        let attempts = 0;
        while (
          validRes.success &&
          validRes.data?.decision === 'REJECTED' &&
          attempts < 2
        ) {
          attempts++;
          this.log(
            'REVISION',
            'Sorular daha kaliteli hale getiriliyor (İnce Ayar)...'
          );
          const revRes = await this.revisionTask.run(
            {
              originalQuestion: question,
              validationResult: validRes.data,
              sharedContextPrompt: sharedContext,
            },
            { logger: (msg, d) => this.log('REVISION', msg, d) }
          );

          if (!revRes.success || !revRes.data) break;
          question = revRes.data;
          validRes = await this.validationTask.run(
            { question, content: cleanContent },
            { logger: (msg, d) => this.log('VALIDATING', msg, d) }
          );
        }

        if (validRes.success && validRes.data?.decision === 'APPROVED') {
          const { error: saveErr } = await Repository.createQuestion({
            chunk_id: chunk.id,
            course_id: chunk.course_id,
            section_title: chunk.section_title,
            usage_type: currentUsageType,
            bloom_level: question.bloomLevel || 'knowledge',
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
            typeGeneratedCount++;
            totalGeneratedCount++;
            this.callbacks.onQuestionSaved(totalGeneratedCount);
            this.log('SAVING', 'Yeni sorunuz kütüphaneye özenle eklendi.', {
              concept: concept.baslik,
              type: currentUsageType,
            });
          } else {
            this.log('ERROR', 'Kayıt hatası', {
              error: saveErr.message,
            });
          }
        } else {
          this.log(
            'ERROR',
            `${concept.baslik} standartlarımıza uymadığı için yeniden denenecek.`,
            { concept: concept.baslik }
          );
        }
      }
    }
    return totalGeneratedCount;
  }
}
