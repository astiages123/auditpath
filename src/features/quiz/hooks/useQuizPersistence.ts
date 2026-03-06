import { useCallback, useMemo } from 'react';
import { QuizPhase } from '@/features/quiz/hooks/quizManagerTypes';
import { QuizResults, QuizState, SessionContext } from '@/features/quiz/types';
import { TopicWithCounts } from '@/features/courses/types/courseTypes';
import { storage } from '@/shared/services/storageService';

export interface ManagerPersistedState {
  selectedTopic: TopicWithCounts | null;
  phase: QuizPhase;
  isQuizActive: boolean;
  savedAt: string;
}

export interface EnginePersistedState {
  state: QuizState;
  results: QuizResults;
  sessionContext: SessionContext | null;
  savedAt: string;
}

export function useQuizPersistence(courseId: string) {
  const quizManagerKey = `quiz-manager-${courseId}`;
  const quizEngineKey = `quiz-engine-${courseId}`;

  const loadManager = useCallback((): ManagerPersistedState | null => {
    return storage.get<ManagerPersistedState>(quizManagerKey);
  }, [quizManagerKey]);

  const saveManager = useCallback(
    (
      selectedTopic: TopicWithCounts | null,
      phase: QuizPhase,
      isQuizActive: boolean
    ) => {
      const stateToSave: ManagerPersistedState = {
        selectedTopic,
        phase,
        isQuizActive,
        savedAt: new Date().toISOString(),
      };
      storage.set(quizManagerKey, stateToSave);
    },
    [quizManagerKey]
  );

  const loadEngine = useCallback((): EnginePersistedState | null => {
    return storage.get<EnginePersistedState>(quizEngineKey);
  }, [quizEngineKey]);

  const saveEngine = useCallback(
    (
      state: QuizState,
      results: QuizResults,
      sessionContext: SessionContext | null
    ) => {
      if (!state.hasStarted) return;

      const stateToSave: EnginePersistedState = {
        state,
        results,
        sessionContext,
        savedAt: new Date().toISOString(),
      };
      storage.set(quizEngineKey, stateToSave);
    },
    [quizEngineKey]
  );

  const clear = useCallback(() => {
    storage.remove(quizManagerKey);
    storage.remove(quizEngineKey);
    storage.remove(`quiz-${courseId}`);
  }, [courseId, quizManagerKey, quizEngineKey]);

  const clearEngine = useCallback(() => {
    storage.remove(quizEngineKey);
  }, [quizEngineKey]);

  return useMemo(
    () => ({
      loadManager,
      saveManager,
      loadEngine,
      saveEngine,
      clear,
      clearEngine,
    }),
    [loadManager, saveManager, loadEngine, saveEngine, clear, clearEngine]
  );
}
