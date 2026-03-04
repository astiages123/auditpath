import { supabase } from '@/lib/supabase';
import { type Database, type Json } from '@/types/database.types';
import { getTaskConfig } from '@/utils/aiConfig';
import { logger } from '@/utils/logger';
import { safeQuery } from '@/lib/supabaseHelpers';
import { z } from 'zod';
import {
  GeneratedQuestionSchema,
  type Message,
  type ValidatedChunkWithContent,
} from '../types';
import { buildFollowUpPrompt } from '../logic/prompts';
import { generate as generateStructured } from '../logic/structuredGenerator';
import { getChunkWithContent, getRecentDiagnoses } from './quizCoreService';
import { getQuestionData } from './quizQuestionService';

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE = 'FollowUpService';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents the structure of question data stored in the database,
 * specifically for follow-up questions.
 */
interface FollowUpQuestionData {
  q: string;
  o: string[];
  a: number;
  exp: string;
  evidence?: string;
}

/**
 * Type definition for the AI-generated question result,
 * inferred from the GeneratedQuestionSchema.
 */
type GeneratedQuestionResult = z.infer<typeof GeneratedQuestionSchema>;

/**
 * Type definition for the insert object used when adding a new question
 * to the 'questions' table.
 */
type QuestionInsert = Database['public']['Tables']['questions']['Insert'];

// ============================================================================
// FOLLOW-UP SERVICES
// ============================================================================

/**
 * Yanlış cevaplanan bir soru için AI destekli takip (follow-up) sorusu üretir
 * ve veritabanına kaydeder.
 *
 * @param progressId - Mevcut çözüm (ilerleme) ID'si
 * @param questionId - Yanlış cevaplanan soru ID'si
 * @param selectedAnswer - Kullanıcının seçtiği yanlış şık indeksi
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @param _sessionNumber - Mevcut seans numarası (şu an kullanılmıyor)
 * @returns Promise<void>
 */
export async function generateFollowUpForWrongAnswer(
  progressId: string,
  questionId: string,
  selectedAnswer: number | null,
  userId: string,
  courseId: string,
  _sessionNumber: number
): Promise<void> {
  const FUNC = 'generateFollowUpForWrongAnswer';

  try {
    // 1. Orijinal soruyu ve chunk bilgisini çek
    const originalQuestionData = await getQuestionData(questionId);
    if (!originalQuestionData || !originalQuestionData.question_data) {
      console.warn(`[${MODULE}][${FUNC}] Orijinal soru bulunamadı:`, {
        questionId,
      });
      logger.warn(MODULE, FUNC, 'Orijinal soru bulunamadı', { questionId });
      return;
    }

    // question_data'nın Json tipinden FollowUpQuestionData tipine güvenli dönüşümü
    const questionDataParseResult = GeneratedQuestionSchema.pick({
      q: true,
      o: true,
      a: true,
      exp: true,
      evidence: true,
    }).safeParse(originalQuestionData.question_data);

    if (!questionDataParseResult.success) {
      console.warn(
        `[${MODULE}][${FUNC}] Orijinal soru verisi beklenen formatta değil:`,
        {
          questionId,
          error: questionDataParseResult.error,
        }
      );
      logger.warn(
        MODULE,
        FUNC,
        'Orijinal soru verisi beklenen formatta değil',
        {
          questionId,
          error: questionDataParseResult.error,
        }
      );
      return;
    }
    const questionData: FollowUpQuestionData = questionDataParseResult.data;

    let chunk: ValidatedChunkWithContent | null = null;
    if (originalQuestionData.chunk_id) {
      chunk = await getChunkWithContent(originalQuestionData.chunk_id);
    }

    // 2. Geçmiş teşhisleri çek (AI bağlamı için)
    let previousDiagnoses: string[] = [];
    if (originalQuestionData.chunk_id) {
      previousDiagnoses = await getRecentDiagnoses(
        userId,
        originalQuestionData.chunk_id,
        3
      );
    }

    // 3. AI Prompt hazırla ve üretim yap
    const evidence = questionData.evidence || questionData.exp;
    const taskPrompt = buildFollowUpPrompt(
      evidence,
      {
        ...questionData,
        bloomLevel: 'Uygulama',
        concept: originalQuestionData.concept_title || '',
      },
      selectedAnswer ?? -1,
      questionData.a,
      'Uygulama',
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

    const result = await generateStructured(messages, {
      schema: GeneratedQuestionSchema,
      task: 'followup',
    });

    if (!result) {
      console.warn(
        `[${MODULE}][${FUNC}] LLM geçerli bir follow-up sorusu üretemedi:`,
        { questionId }
      );
      logger.warn(MODULE, FUNC, 'LLM geçerli bir follow-up sorusu üretemedi', {
        questionId,
      });
      return;
    }

    // AI üretim sonucunu tiplendir
    const generatedQuestion: GeneratedQuestionResult = result;

    // 4. Teşhis ve yeni soruyu kaydet
    const updates: Promise<unknown>[] = [];

    // 4a. Mevcut progress kaydına AI teşhisini ekle
    if (generatedQuestion.diagnosis || generatedQuestion.insight) {
      updates.push(
        safeQuery(
          supabase
            .from('user_quiz_progress')
            .update({
              ai_diagnosis: generatedQuestion.diagnosis || null,
              ai_insight: generatedQuestion.insight || null,
            })
            .eq('id', progressId),
          `${FUNC} update diagnosis error`,
          { progressId }
        )
      );
    }

    // 4b. Yeni takip sorusunu questions tablosuna ekle
    const insertData: QuestionInsert = {
      chunk_id: originalQuestionData.chunk_id,
      course_id: courseId,
      section_title: chunk?.section_title || '',
      usage_type: 'antrenman' as const,
      bloom_level: 'application' as const,
      parent_question_id: questionId,
      created_by: userId,
      question_data: {
        q: generatedQuestion.q,
        o: generatedQuestion.o,
        a: generatedQuestion.a,
        exp: generatedQuestion.exp,
        img: generatedQuestion.img ?? null,
        diagnosis: generatedQuestion.diagnosis,
        insight: generatedQuestion.insight,
        evidence: generatedQuestion.evidence || '',
      } as Json,
    };

    updates.push(
      safeQuery(
        supabase.from('questions').insert(insertData),
        `${FUNC} insert follow-up error`,
        { insertData }
      )
    );

    await Promise.allSettled(updates);
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata oluştu', error);
  }
}
