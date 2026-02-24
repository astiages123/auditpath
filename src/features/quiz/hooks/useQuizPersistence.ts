import { useCallback, useRef } from 'react';
import { QuizPhase } from '@/features/quiz/hooks/useQuizManager';
import { logger } from '@/utils/logger';

interface PersistedQuizState {
  selectedTopicName: string | null;
  phase: QuizPhase;
  savedAt: string; // ISO 8601
}

export function useQuizPersistence(courseId: string) {
  const getStorageKey = useCallback(
    () => `auditpath-quiz-${courseId}`,
    [courseId]
  );
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback((): PersistedQuizState | null => {
    try {
      if (!courseId) return null;

      const key = getStorageKey();
      const item = localStorage.getItem(key);

      if (!item) return null;

      const parsed = JSON.parse(item) as PersistedQuizState;

      // Check if older than 24 hours
      const savedTime = new Date(parsed.savedAt).getTime();
      const now = new Date().getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (now - savedTime > twentyFourHours) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed;
    } catch (error) {
      logger.error(
        'Failed to load quiz state from localStorage',
        error as Error
      );
      return null;
    }
  }, [courseId, getStorageKey]);

  const save = useCallback(
    (topicName: string | null, phase: QuizPhase) => {
      try {
        if (!courseId) return;

        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
          const stateToSave: PersistedQuizState = {
            selectedTopicName: topicName,
            phase,
            savedAt: new Date().toISOString(),
          };

          localStorage.setItem(getStorageKey(), JSON.stringify(stateToSave));
        }, 500); // Debounce 500ms
      } catch (error) {
        logger.error(
          'Failed to save quiz state to localStorage',
          error as Error
        );
      }
    },
    [courseId, getStorageKey]
  );

  const clear = useCallback(() => {
    try {
      if (!courseId) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      localStorage.removeItem(getStorageKey());
    } catch (error) {
      logger.error(
        'Failed to clear quiz state from localStorage',
        error as Error
      );
    }
  }, [courseId, getStorageKey]);

  return { load, save, clear };
}
