import { useCallback, useRef } from 'react';
import { QuizPhase } from '@/features/quiz/hooks/useQuizManager';
import { QuizResults, QuizState, SessionContext } from '@/features/quiz/types';
import { TopicWithCounts } from '@/features/courses/types/courseTypes';
import { logger } from '@/utils/logger';

export interface ManagerPersistedState {
  selectedTopic: TopicWithCounts | null;
  phase: QuizPhase;
  isQuizActive: boolean;
  savedAt: string; // ISO 8601
}

export interface EnginePersistedState {
  state: QuizState;
  results: QuizResults;
  sessionContext: SessionContext | null;
  savedAt: string; // ISO 8601
}

export function useQuizPersistence(courseId: string) {
  const getManagerKey = useCallback(
    () => `auditpath-quiz-manager-${courseId}`,
    [courseId]
  );
  const getEngineKey = useCallback(
    () => `auditpath-quiz-engine-${courseId}`,
    [courseId]
  );

  const saveManagerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveEngineTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadManager = useCallback((): ManagerPersistedState | null => {
    try {
      if (!courseId) return null;
      const item = localStorage.getItem(getManagerKey());
      if (!item) return null;

      const parsed = JSON.parse(item) as ManagerPersistedState;

      // Check if older than 24 hours
      const savedTime = new Date(parsed.savedAt).getTime();
      const now = new Date().getTime();
      if (now - savedTime > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(getManagerKey());
        return null;
      }
      return parsed;
    } catch (error) {
      logger.error('Failed to load manager quiz state', error as Error);
      return null;
    }
  }, [courseId, getManagerKey]);

  const saveManager = useCallback(
    (
      selectedTopic: TopicWithCounts | null,
      phase: QuizPhase,
      isQuizActive: boolean
    ) => {
      try {
        if (!courseId) return;
        if (saveManagerTimeoutRef.current) {
          clearTimeout(saveManagerTimeoutRef.current);
        }

        saveManagerTimeoutRef.current = setTimeout(() => {
          const stateToSave: ManagerPersistedState = {
            selectedTopic,
            phase,
            isQuizActive,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem(getManagerKey(), JSON.stringify(stateToSave));
        }, 500);
      } catch (error) {
        logger.error('Failed to save manager quiz state', error as Error);
      }
    },
    [courseId, getManagerKey]
  );

  const loadEngine = useCallback((): EnginePersistedState | null => {
    try {
      if (!courseId) return null;
      const item = localStorage.getItem(getEngineKey());
      if (!item) return null;

      const parsed = JSON.parse(item) as EnginePersistedState;

      const savedTime = new Date(parsed.savedAt).getTime();
      const now = new Date().getTime();
      if (now - savedTime > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(getEngineKey());
        return null;
      }
      return parsed;
    } catch (error) {
      logger.error('Failed to load engine quiz state', error as Error);
      return null;
    }
  }, [courseId, getEngineKey]);

  const saveEngine = useCallback(
    (
      state: QuizState,
      results: QuizResults,
      sessionContext: SessionContext | null
    ) => {
      try {
        if (!courseId || !state.hasStarted) return; // don't save empty state
        if (saveEngineTimeoutRef.current) {
          clearTimeout(saveEngineTimeoutRef.current);
        }

        saveEngineTimeoutRef.current = setTimeout(() => {
          const stateToSave: EnginePersistedState = {
            state,
            results,
            sessionContext,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem(getEngineKey(), JSON.stringify(stateToSave));
        }, 500);
      } catch (error) {
        logger.error('Failed to save engine quiz state', error as Error);
      }
    },
    [courseId, getEngineKey]
  );

  const clear = useCallback(() => {
    try {
      if (!courseId) return;
      if (saveManagerTimeoutRef.current) {
        clearTimeout(saveManagerTimeoutRef.current);
      }
      if (saveEngineTimeoutRef.current) {
        clearTimeout(saveEngineTimeoutRef.current);
      }

      localStorage.removeItem(getManagerKey());
      localStorage.removeItem(getEngineKey());

      // Also clear old format if it exists
      localStorage.removeItem(`auditpath-quiz-${courseId}`);
    } catch (error) {
      logger.error('Failed to clear quiz state', error as Error);
    }
  }, [courseId, getManagerKey, getEngineKey]);

  const clearEngine = useCallback(() => {
    try {
      if (!courseId) return;
      if (saveEngineTimeoutRef.current) {
        clearTimeout(saveEngineTimeoutRef.current);
      }

      localStorage.removeItem(getEngineKey());
    } catch (error) {
      logger.error('Failed to clear engine quiz state', error as Error);
    }
  }, [courseId, getEngineKey]);

  return {
    loadManager,
    saveManager,
    loadEngine,
    saveEngine,
    clear,
    clearEngine,
  };
}
