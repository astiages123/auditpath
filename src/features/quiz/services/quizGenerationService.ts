import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import { isValidUuid, parseArray } from '@/utils/validation';
import type { Json } from '@/types/database.types';
import {
  type QuestionWithStatus,
  QuestionWithStatusRowSchema,
  type QuizQuestion,
} from '@/features/quiz/types';
import { MASTERY_THRESHOLD } from '@/features/quiz/utils/constants';
import { fetchQuestionsByCourse } from './quizRepository';

/** Akıllı sınav (Smart Exam) üretimi için soru listesi hazırlar */
export async function generateSmartExam(
  courseId: string,
  _userId: string
): Promise<{ success: boolean; questionIds: string[] }> {
  const questions = await fetchQuestionsByCourse(courseId, 20);
  return {
    success: true,
    questionIds: (questions as { id: string }[]).map((question) => question.id),
  };
}

/** Waterfall (akışkan) eğitim sorularını getirir */
export async function fetchWaterfallTrainingQuestions(
  userId: string,
  courseId: string,
  targetChunkId: string,
  limit: number
): Promise<QuestionWithStatus[]> {
  const allChunkIds: string[] = [];
  if (isValidUuid(targetChunkId)) allChunkIds.push(targetChunkId);

  const { data: weakChunks } = await safeQuery<{ chunk_id: string }[]>(
    supabase
      .from('chunk_mastery')
      .select('chunk_id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .filter(
        'chunk_id',
        'neq',
        isValidUuid(targetChunkId)
          ? targetChunkId
          : '00000000-0000-0000-0000-000000000000'
      )
      .lt('mastery_score', MASTERY_THRESHOLD)
      .order('updated_at', {
        ascending: false,
      }),
    'fetchWaterfallTrainingQuestions weakChunks error',
    { userId, courseId }
  );
  if (weakChunks)
    allChunkIds.push(...weakChunks.map((chunk) => chunk.chunk_id));
  if (allChunkIds.length === 0) return [];

  const [activeQuestions, nullQuestions] = await Promise.all([
    fetchActiveQuestionsFromChunks(userId, allChunkIds, limit),
    fetchNullQuestionsFromChunks(allChunkIds, limit),
  ]);

  const activeByChunk = new Map<string, QuestionWithStatus[]>();
  activeQuestions.forEach((question) => {
    const chunkId = question.questions.chunk_id as string;
    if (!activeByChunk.has(chunkId)) activeByChunk.set(chunkId, []);
    activeByChunk.get(chunkId)!.push(question);
  });

  const nullByChunk = new Map<string, QuestionWithStatus[]>();
  nullQuestions.forEach((question) => {
    const chunkId = question.questions.chunk_id as string;
    if (!nullByChunk.has(chunkId)) nullByChunk.set(chunkId, []);
    nullByChunk.get(chunkId)!.push(question);
  });

  const results: QuestionWithStatus[] = [];
  for (const chunkId of allChunkIds) {
    const remaining = limit - results.length;
    if (remaining <= 0) break;

    const active = activeByChunk.get(chunkId) || [];
    const nulls = nullByChunk.get(chunkId) || [];
    results.push(...active.slice(0, remaining));

    const stillNeeded = limit - results.length;
    if (stillNeeded > 0) {
      results.push(...nulls.slice(0, stillNeeded));
    }
  }

  return results.slice(0, limit);
}

/** Yardımcı: Çoklu chunk ID listesinden aktif soruları getirir */
async function fetchActiveQuestionsFromChunks(
  userId: string,
  chunkIds: string[],
  limit: number
): Promise<QuestionWithStatus[]> {
  if (chunkIds.length === 0) return [];
  const { data } = await safeQuery<
    {
      question_id: string;
      status: 'active' | 'reviewing' | 'mastered';
      next_review_session: number | null;
      questions: {
        id: string;
        chunk_id: string | null;
        course_id: string;
        parent_question_id: string | null;
        question_data: Json;
      };
    }[]
  >(
    supabase
      .from('user_question_status')
      .select(
        `question_id, status, next_review_session, questions!inner (id, chunk_id, course_id, parent_question_id, question_data)`
      )
      .eq('user_id', userId)
      .in('questions.chunk_id', chunkIds)
      .eq('status', 'active')
      .eq('questions.usage_type', 'antrenman')
      .limit(limit),
    'fetchActiveQuestionsFromChunks error',
    { userId, chunkIds }
  );
  return (
    (parseArray(
      QuestionWithStatusRowSchema,
      data || []
    ) as QuestionWithStatus[]) || []
  );
}

/** Yardımcı: Çoklu chunk ID listesinden henüz çözülmemiş soruları getirir */
async function fetchNullQuestionsFromChunks(
  chunkIds: string[],
  limit: number
): Promise<QuestionWithStatus[]> {
  if (chunkIds.length === 0) return [];
  const { data } = await safeQuery<
    {
      id: string;
      chunk_id: string | null;
      course_id: string;
      parent_question_id: string | null;
      question_data: Json;
    }[]
  >(
    supabase
      .from('questions')
      .select(
        `id, chunk_id, course_id, parent_question_id, question_data, user_question_status!left (id)`
      )
      .in('chunk_id', chunkIds)
      .eq('usage_type', 'antrenman')
      .is('user_question_status.id', null)
      .limit(limit),
    'fetchNullQuestionsFromChunks error',
    { chunkIds }
  );
  return (data || []).map((q) => {
    const qData = q.question_data as Record<string, unknown>;
    return {
      question_id: q.id,
      status: 'active',
      next_review_session: null,
      questions: {
        id: q.id,
        chunk_id: q.chunk_id || '00000000-0000-0000-0000-000000000000',
        course_id: q.course_id,
        parent_question_id: q.parent_question_id,
        question_data: {
          ...qData,
          type: 'multiple_choice',
          q: qData.q || '',
          o: qData.o || [],
          a: qData.a ?? 0,
          exp: qData.exp || '',
          img: qData.img ?? null,
          diagnosis: qData.diagnosis || qData.ai_diagnosis || '',
          insight: qData.insight || qData.ai_insight || '',
          evidence: qData.evidence || '',
        } as QuizQuestion,
      },
    };
  }) as QuestionWithStatus[];
}
