import { useEffect, useReducer, useTransition } from 'react';
import { fetchCourseNotes } from '../services/noteService';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { storage } from '@/shared/services/storageService';
import { logger } from '@/utils/logger';

export interface UseNotesDataProps {
  /** Kurs adlandırıcısı (URL path için, örn: ATA_584) */
  courseSlug: string;
  /** Mevcut kullanıcının benzersiz ID değeri (opsiyonel) */
  userId?: string;
}

export interface NotesState {
  /** Yüklenen konu yığınları */
  chunks: CourseTopic[];
  /** Veri yüklenme durumu */
  loading: boolean;
  /** Hata mesajı (eğer varsa) */
  error: string | null;
  /** Yüklenen dersin adı */
  courseName: string;
}

export type NotesAction =
  | { type: 'FETCH_START' }
  | {
      type: 'FETCH_SUCCESS';
      chunks: CourseTopic[];
      courseName: string;
    }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'SET_LOADING'; loading: boolean };

export interface NotesDataReturn extends NotesState {
  /** UI tepkiselliği için hook'un beklemede (transition) olma durumu */
  isPending: boolean;
}

export interface CachedNotesPayload {
  data: CourseTopic[];
  timestamp: number;
}

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

/**
 * Belirli bir kursun not içeriklerini, önbelleği (cache) de kullaranak asenkron yükler.
 *
 * @param {UseNotesDataProps} props - Gerekli hook parametreleri
 * @returns {NotesDataReturn} Veri yüklenme durumu ve not verilerini döner.
 */
export function useNotesData({
  courseSlug,
  userId,
}: UseNotesDataProps): NotesDataReturn {
  const [state, dispatch] = useReducer(notesReducer, {
    chunks: [],
    loading: true,
    error: null,
    courseName: '',
  });

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const controller: AbortController = new AbortController();
    const signal: AbortSignal = controller.signal;

    async function fetchData(): Promise<void> {
      if (!userId || !courseSlug) {
        dispatch({ type: 'SET_LOADING', loading: false });
        return;
      }

      try {
        dispatch({ type: 'FETCH_START' });

        const cacheKey = `cached_notes_v6_${courseSlug}`;
        const cachedContent = storage.get<CachedNotesPayload>(cacheKey, userId);

        if (cachedContent?.data) {
          dispatch({
            type: 'FETCH_SUCCESS',
            chunks: cachedContent.data,
            courseName: cachedContent.data[0]?.course_name || '',
          });
        }

        const fetchedResult = await fetchCourseNotes(
          userId,
          courseSlug,
          signal
        );
        if (signal.aborted || !fetchedResult) return;

        if (fetchedResult.chunks.length > 0) {
          startTransition(() => {
            dispatch({
              type: 'FETCH_SUCCESS',
              chunks: fetchedResult.chunks,
              courseName: fetchedResult.courseName || '',
            });
          });

          storage.set(
            cacheKey,
            {
              timestamp: Date.now(),
              data: fetchedResult.chunks,
            },
            { userId }
          );
          return;
        }

        if (!cachedContent) {
          dispatch({
            type: 'FETCH_ERROR',
            error: 'Bu ders için henüz içerik bulunmuyor.',
          });
        }
      } catch (fetchError: unknown) {
        if (signal.aborted) return;

        logger.error(
          'useNotesData',
          'fetchData',
          'Notes loading error',
          fetchError as Error
        );
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

    fetchData();

    return () => {
      controller.abort();
    };
  }, [courseSlug, userId]);

  return {
    ...state,
    isPending,
  };
}
