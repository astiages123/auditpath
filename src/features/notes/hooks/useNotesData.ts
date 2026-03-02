import { useEffect, useReducer, useTransition } from 'react';
import { fetchCourseNotes } from '../services/noteService';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { storage } from '@/shared/services/storageService';
import { logger } from '@/utils/logger';

interface UseNotesDataProps {
  courseSlug: string;
  userId?: string;
}

type NotesState = {
  chunks: CourseTopic[];
  loading: boolean;
  error: string | null;
  courseName: string;
};

type NotesAction =
  | { type: 'FETCH_START' }
  | {
      type: 'FETCH_SUCCESS';
      chunks: CourseTopic[];
      courseName: string;
    }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'SET_LOADING'; loading: boolean };

function notesReducer(state: NotesState, action: NotesAction): NotesState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        chunks: action.chunks,
        courseName: action.courseName,
        loading: false,
        error: null,
      };
    case 'FETCH_ERROR':
      return { ...state, error: action.error, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    default:
      return state;
  }
}

export interface NotesData extends NotesState {
  isPending: boolean;
}

export function useNotesData({
  courseSlug,
  userId,
}: UseNotesDataProps): NotesData {
  const [state, dispatch] = useReducer(notesReducer, {
    chunks: [],
    loading: true,
    error: null,
    courseName: '',
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function fetchNotes() {
      if (!userId || !courseSlug) {
        dispatch({ type: 'SET_LOADING', loading: false });
        return;
      }

      try {
        dispatch({ type: 'FETCH_START' });
        // Standardize cache key
        const cacheKey = `cached_notes_v6_${courseSlug}`;
        const cached = storage.get<{ data: CourseTopic[]; timestamp: number }>(
          cacheKey
        );

        if (cached?.data) {
          dispatch({
            type: 'FETCH_SUCCESS',
            chunks: cached.data,
            courseName: cached.data[0]?.course_name || '',
          });
        }

        const result = await fetchCourseNotes(userId, courseSlug, signal);

        if (signal.aborted || !result) return;

        if (result.chunks.length > 0) {
          startTransition(() => {
            dispatch({
              type: 'FETCH_SUCCESS',
              chunks: result.chunks,
              courseName: result.courseName || '',
            });
          });

          storage.set(cacheKey, {
            timestamp: Date.now(),
            data: result.chunks,
          });
        } else if (!cached) {
          dispatch({
            type: 'FETCH_ERROR',
            error: 'Bu ders için henüz içerik bulunmuyor.',
          });
        }
      } catch (err) {
        if (signal.aborted) return;
        logger.error('Notes loading error', err as Error);
        dispatch({
          type: 'FETCH_ERROR',
          error: 'Notlar yüklenirken bir hata oluştu.',
        });
      } finally {
        if (!signal.aborted) {
          dispatch({ type: 'SET_LOADING', loading: false });
        }
      }
    }

    fetchNotes();

    return () => {
      controller.abort();
    };
  }, [courseSlug, userId]);

  return {
    ...state,
    isPending,
  };
}
