import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';

export interface UserNotesProgress {
  chunk_id: string;
  progress: number;
}

interface NoteChunkRow {
  id: string;
}

interface UserNotesProgressRow {
  chunk_id: string;
  progress: number;
}

/**
 * Fetches progress for all chunks in a given course for the current user.
 */
export async function fetchCourseProgress(
  userId: string,
  courseId: string
): Promise<UserNotesProgress[]> {
  const { data: chunkData } = await supabase
    .from('note_chunks')
    .select('id')
    .eq('course_id', courseId);

  const chunkIds = (chunkData || []).map((c: NoteChunkRow) => c.id);
  if (chunkIds.length === 0) return [];

  const { data } = await safeQuery<UserNotesProgressRow[]>(
    supabase
      .from('user_notes_progress')
      .select('chunk_id, progress')
      .eq('user_id', userId)
      .in('chunk_id', chunkIds),
    'fetchCourseProgress error'
  );

  return data || [];
}

/**
 * Upserts progress for a specific chunk.
 */
export async function upsertNotesProgress(
  userId: string,
  chunkId: string,
  progress: number
): Promise<void> {
  await safeQuery(
    supabase.from('user_notes_progress').upsert(
      {
        user_id: userId,
        chunk_id: chunkId,
        progress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,chunk_id' }
    ),
    'upsertNotesProgress error'
  );
}
