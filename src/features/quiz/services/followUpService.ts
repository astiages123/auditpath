import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { getQuestionData } from './quizQuestionService';
import { getChunkWithContent, getRecentDiagnoses } from './quizCoreService';
import { buildFollowUpPrompt } from '../logic/prompts';
import { StructuredGenerator } from '../logic/structuredGenerator';
import {
  GeneratedQuestionSchema,
  type Json,
  type Message,
  type ValidatedChunkWithContent,
} from '../types';
import { getTaskConfig } from '@/utils/aiConfig';
import { type Database } from '@/types/database.types';

const followUpLogger = logger.withPrefix('[FollowUpService]');

export async function generateFollowUpForWrongAnswer(
  progressId: string,
  questionId: string,
  selectedAnswer: number | null,
  userId: string,
  courseId: string,
  _sessionNumber: number
): Promise<void> {
  try {
    // Adım 1 — Orijinal soruyu çek
    const originalQuestionData = await getQuestionData(questionId);
    if (!originalQuestionData || !originalQuestionData.question_data) {
      followUpLogger.warn('Orijinal soru bulunamadı', { questionId });
      return;
    }

    const questionData = originalQuestionData.question_data as {
      q: string;
      o: string[];
      a: number;
      exp: string;
      evidence?: string;
    };

    let chunk: ValidatedChunkWithContent | null = null;
    if (originalQuestionData.chunk_id) {
      chunk = await getChunkWithContent(originalQuestionData.chunk_id);
    }

    // Adım 2 — Geçmiş teşhisleri çek
    let previousDiagnoses: string[] = [];
    if (originalQuestionData.chunk_id) {
      previousDiagnoses = await getRecentDiagnoses(
        userId,
        originalQuestionData.chunk_id,
        3
      );
    }

    // Adım 3 — AI'a gönder
    const evidence = questionData.evidence || questionData.exp;
    const taskPrompt = buildFollowUpPrompt(
      evidence,
      questionData,
      selectedAnswer ?? -1,
      questionData.a,
      'application',
      '',
      previousDiagnoses
    );

    const config = getTaskConfig('followup');
    const messages: Message[] = [
      {
        role: 'system' as const,
        content: config.systemPromptPrefix || 'Sen bir öğretmen asistanısın.',
      },
      { role: 'user' as const, content: taskPrompt },
    ];

    const result = await StructuredGenerator.generate(messages, {
      schema: GeneratedQuestionSchema,
      task: 'followup',
      throwOnValidationError: false,
    });

    if (!result) {
      followUpLogger.warn('LLM geçerli bir follow-up sorusu üretemedi', {
        questionId,
      });
      return;
    }

    // Adım 4 — Paralel kaydet
    const promises = [];

    // 4a. user_quiz_progress tablosundaki mevcut kaydı güncelle
    if (result.diagnosis || result.insight) {
      promises.push(
        supabase
          .from('user_quiz_progress')
          .update({
            ai_diagnosis: result.diagnosis || null,
            ai_insight: result.insight || null,
          })
          .eq('id', progressId)
          .then(({ error }) => {
            if (error) {
              followUpLogger.warn('user_quiz_progress güncellenemedi', {
                error,
                progressId,
              });
            }
          })
      );
    }

    // 4b. Yeni soruyu questions tablosuna kaydet
    const insertData: Database['public']['Tables']['questions']['Insert'] = {
      chunk_id: originalQuestionData.chunk_id,
      course_id: courseId,
      section_title: chunk?.section_title || '',
      usage_type: 'antrenman' as const,
      bloom_level: 'application' as const,
      parent_question_id: questionId,
      created_by: userId,
      question_data: {
        q: result.q,
        o: result.o,
        a: result.a,
        exp: result.exp,
        img: (result as { img?: number | null }).img ?? null,
        diagnosis: result.diagnosis,
        insight: result.insight,
        evidence: (result as { evidence: string }).evidence,
      } as Json,
    };

    promises.push(
      supabase
        .from('questions')
        .insert(insertData)
        .then(({ error }) => {
          if (error) {
            followUpLogger.warn('questions tablosuna eklenemedi', {
              error,
              questionId,
            });
          }
        })
    );

    await Promise.allSettled(promises);
  } catch (error) {
    // Tüm hataları yut, kullanıcıyı etkilemesin
    followUpLogger.warn('generateFollowUpForWrongAnswer içinde hata oluştu', {
      error,
      questionId,
    });
  }
}
