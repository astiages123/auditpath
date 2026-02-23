import { supabase } from '@/lib/supabase';
import {
  getCourseIdBySlug,
  getCourseTopics,
} from '@/features/quiz/services/quizCoreService';
import { processTopicContent } from '../logic/contentProcessor';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { safeQuery } from '@/lib/supabaseHelpers';

export interface SyncStats {
  synced: number;
  deleted: number;
  skipped: number;
  errors: number;
}

export interface SyncResponse {
  success: boolean;
  stats?: SyncStats;
  error?: string;
}

/**
 * Fetches course notes and processes their content.
 *
 * @param userId User ID
 * @param courseSlug Course slug
 * @param signal AbortSignal for cancellation
 * @returns Object with courseName and chunks, or null
 */
export async function fetchCourseNotes(
  userId: string,
  courseSlug: string,
  signal?: AbortSignal
): Promise<{ courseName: string; chunks: CourseTopic[] } | null> {
  const targetId = await getCourseIdBySlug(courseSlug, signal);
  if (!targetId || (signal && signal.aborted)) return null;

  const data = await getCourseTopics(userId, targetId, signal);
  if (signal && signal.aborted) return null;

  const processedData = data.map((chunk) => {
    const metadata = chunk.metadata as { images?: string[] } | null;
    return {
      ...chunk,
      content: processTopicContent(chunk.content, metadata),
    };
  });

  return {
    courseName: processedData[0]?.course_name || '',
    chunks: processedData,
  };
}

/**
 * Invokes the Notion sync Edge Function.
 *
 * @returns Sync response data
 */
export async function invokeNotionSync(): Promise<SyncResponse> {
  const { data } = await safeQuery<SyncResponse>(
    supabase.functions.invoke<SyncResponse>('notion-sync', {
      method: 'POST',
    }) as PromiseLike<{ data: SyncResponse | null; error: unknown }>,
    'invokeNotionSync error'
  );

  if (!data) {
    throw new Error('Senkronizasyon servisinden yanıt alınamadı.');
  }

  return data;
}
