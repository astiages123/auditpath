import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';

export interface NoteChunkRow {
  id: string;
  metadata: unknown;
  course_id: string | null;
}

export interface ChunkMasteryRow {
  chunk_id: string | null;
  mastery_score: number | null;
}

/**
 * Konu haritası oluşturmak için gerekli olan tüm note_chunk verilerini getirir.
 */
export async function getNoteChunksWithMetadata() {
  return safeQuery<NoteChunkRow[]>(
    supabase
      .from('note_chunks')
      .select('id, metadata, course_id')
      .not('metadata', 'is', null),
    'Error fetching note chunks'
  );
}

/**
 * Kullanıcının mevcut tüm konu ustalık skorlarını getirir.
 */
export async function getUserChunkMasteries(userId: string) {
  return safeQuery<ChunkMasteryRow[]>(
    supabase
      .from('chunk_mastery')
      .select('chunk_id, mastery_score')
      .eq('user_id', userId),
    'Error fetching chunk mastery'
  );
}
