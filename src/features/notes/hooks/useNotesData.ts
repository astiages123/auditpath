import { useEffect, useState, useTransition } from 'react';
import {
  getCourseIdBySlug,
  getCourseTopics,
} from '@/features/quiz/services/quizTopicService';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { storage } from '@/shared/services/storageService';
import { logger } from '@/utils/logger';
import { processTopicContent } from '../logic/contentProcessor';

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
        const targetId = await getCourseIdBySlug(courseSlug, signal);

        if (signal.aborted) return;

        if (!targetId) {
          setError('Ders bulunamadı.');
          setLoading(false);
          return;
        }

        const cacheKey = `cached_notes_v6_${targetId}`;
        const cached = storage.get<{ data: CourseTopic[]; timestamp: number }>(
          cacheKey
        );

        if (cached?.data) {
          setChunks(cached.data);
          setCourseName(cached.data[0]?.course_name || '');
          setLoading(false);
        }

        const data = await getCourseTopics(userId, targetId, signal);

        if (signal.aborted) return;

        const processedData = data.map((chunk) => {
          const metadata = chunk.metadata as { images?: string[] } | null;
          return {
            ...chunk,
            content: processTopicContent(
              chunk.display_content || chunk.content,
              metadata
            ),
          };
        });

        if (processedData.length > 0) {
          startTransition(() => {
            setChunks(processedData);
            setCourseName(processedData[0].course_name);
          });

          storage.set(
            cacheKey,
            {
              timestamp: Date.now(),
              data: processedData,
            },
            { ttl: 7 * 24 * 60 * 60 * 1000 } // 7 days cache
          );
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
