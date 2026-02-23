import { useEffect, useState, useTransition } from 'react';
import { fetchCourseNotes } from '../services/noteService';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { storage } from '@/shared/services/storageService';
import { logger } from '@/utils/logger';

interface UseNotesDataProps {
  courseSlug: string;
  userId?: string;
}

interface NotesData {
  chunks: CourseTopic[];
  loading: boolean;
  error: string | null;
  courseName: string;
  isPending: boolean;
}

export function useNotesData({
  courseSlug,
  userId,
}: UseNotesDataProps): NotesData {
  const [chunks, setChunks] = useState<CourseTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseName, setCourseName] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function fetchNotes() {
      if (!userId || !courseSlug) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Standardize cache key
        const cacheKey = `cached_notes_v6_${courseSlug}`;
        const cached = storage.get<{ data: CourseTopic[]; timestamp: number }>(
          cacheKey
        );

        if (cached?.data) {
          setChunks(cached.data);
          setCourseName(cached.data[0]?.course_name || '');
          setLoading(false);
        }

        const result = await fetchCourseNotes(userId, courseSlug, signal);

        if (signal.aborted || !result) return;

        if (result.chunks.length > 0) {
          startTransition(() => {
            setChunks(result.chunks);
            setCourseName(result.courseName);
          });

          storage.set(cacheKey, {
            timestamp: Date.now(),
            data: result.chunks,
          });
        } else if (!cached) {
          setError('Bu ders için henüz içerik bulunmuyor.');
        }
      } catch (err) {
        if (signal.aborted) return;
        logger.error('Notes loading error', err as Error);
        setError('Notlar yüklenirken bir hata oluştu.');
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchNotes();

    return () => {
      controller.abort();
    };
  }, [courseSlug, userId]);

  return {
    chunks,
    loading,
    error,
    courseName,
    isPending,
  };
}
