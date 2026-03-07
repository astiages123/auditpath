import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import { isValidUuid } from '@/utils/validation';
import { logger } from '@/utils/logger';
import {
  type ChunkMasteryRow,
  type ValidatedChunkWithContent,
} from '@/features/quiz/types';
import type { CourseTopic } from '@/features/courses/types/courseTypes';

const MODULE = 'QuizChunkService';

export interface NoteChunkData {
  content: string;
  metadata: Record<string, unknown>;
  ai_logic: Record<string, unknown>;
  course: { course_slug: string };
}

export async function getRecentDiagnoses(
  userId: string,
  chunkId: string,
  limit: number
): Promise<string[]> {
  const FUNC = 'getRecentDiagnoses';
  if (!isValidUuid(chunkId)) return [];
  const { data } = await safeQuery<{ ai_diagnosis: string | null }[]>(
    supabase
      .from('user_quiz_progress')
      .select('ai_diagnosis')
      .eq('user_id', userId)
      .eq('chunk_id', chunkId)
      .not('ai_diagnosis', 'is', null)
      .order('answered_at', { ascending: false })
      .limit(limit),
    `${FUNC} error`,
    { userId, chunkId }
  );

  return (data || [])
    .map((progressItem) => progressItem.ai_diagnosis)
    .filter((diagnosis): diagnosis is string => Boolean(diagnosis));
}

export async function getNoteChunkById(
  chunkId: string
): Promise<NoteChunkData | null> {
  const FUNC = 'getNoteChunkById';
  if (!isValidUuid(chunkId)) {
    logger.warn(MODULE, FUNC, `Invalid UUID passed: ${chunkId}`);
    return null;
  }

  const { data, success } = await safeQuery<NoteChunkData>(
    supabase
      .from('note_chunks')
      .select('content, metadata, ai_logic, course:courses(course_slug)')
      .eq('id', chunkId)
      .maybeSingle(),
    `${FUNC} error`,
    { chunkId }
  );

  if (!success) return null;
  return data ?? null;
}

export async function getCourseTopics(
  _userId: string,
  courseId: string | null,
  signal?: AbortSignal
): Promise<CourseTopic[]> {
  const FUNC = 'getCourseTopics';
  if (!courseId) return [];

  let query = supabase
    .from('note_chunks')
    .select(
      'id, created_at, course_id, course_name, section_title, chunk_order, status, last_synced_at, metadata'
    )
    .eq('course_id', courseId)
    .order('chunk_order', { ascending: true });

  if (signal) {
    query = (
      query as typeof query & {
        abortSignal: (s: AbortSignal) => typeof query;
      }
    ).abortSignal(signal);
  }

  const { data: chunks, success } = await safeQuery<Record<string, unknown>[]>(
    query,
    `${FUNC} error`,
    { courseId }
  );

  if (!success || !chunks) {
    return [];
  }

  return chunks.map((chunk) => ({
    ...chunk,
    questionCount: 0,
  })) as CourseTopic[];
}

export async function getChunkMastery(
  userId: string,
  chunkId: string
): Promise<ChunkMasteryRow | null> {
  const FUNC = 'getChunkMastery';
  if (!isValidUuid(chunkId)) return null;
  const { data } = await safeQuery<{
    chunk_id: string;
    mastery_score: number;
    last_full_review_at: string | null;
    total_questions_seen: number | null;
  }>(
    supabase
      .from('chunk_mastery')
      .select(
        'chunk_id, mastery_score, last_full_review_at, total_questions_seen'
      )
      .eq('user_id', userId)
      .eq('chunk_id', chunkId)
      .maybeSingle(),
    `${FUNC} error`,
    { userId, chunkId }
  );

  if (!data) return null;

  return {
    chunk_id: data.chunk_id,
    user_id: userId,
    mastery_score: data.mastery_score,
    last_full_review_at: data.last_full_review_at,
    total_questions_seen: data.total_questions_seen ?? 0,
  };
}

export async function getChunkWithContent(
  chunkId: string
): Promise<ValidatedChunkWithContent | null> {
  const FUNC = 'getChunkWithContent';
  if (!isValidUuid(chunkId)) return null;
  const { data } = await safeQuery<ValidatedChunkWithContent>(
    supabase
      .from('note_chunks')
      .select(
        'id, course_id, metadata, status, content, course_name, section_title, ai_logic'
      )
      .eq('id', chunkId)
      .single(),
    `${FUNC} error`,
    { chunkId }
  );

  if (!data) return null;
  return data;
}

export async function getFirstChunkIdForTopic(
  courseId: string,
  topicName: string
): Promise<string | null> {
  const FUNC = 'getFirstChunkIdForTopic';
  const { data } = await safeQuery<{ id: string }>(
    supabase
      .from('note_chunks')
      .select('id')
      .eq('course_id', courseId)
      .eq('section_title', topicName)
      .order('chunk_order', { ascending: true })
      .limit(1)
      .maybeSingle(),
    `${FUNC} error`,
    { courseId, topicName }
  );
  return data?.id || null;
}
