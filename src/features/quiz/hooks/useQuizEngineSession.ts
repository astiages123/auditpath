import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  QuizQuestion,
  QuizResults,
  QuizState,
  SessionContext,
} from '@/features/quiz/types';
import { logger } from '@/utils/logger';
import { useQuizPersistence } from './useQuizPersistence';
import { useQuizTimer } from './useQuizTimer';
import { useQuizEngineApi } from './useQuizEngineApi';
import {
  INITIAL_QUIZ_RESULTS,
  INITIAL_QUIZ_STATE,
  normalizeQuizState,
} from './quizEngineState';

export function useQuizEngineSession(courseId: string) {
  const { loadEngine, saveEngine, clearEngine } = useQuizPersistence(courseId);
  const api = useQuizEngineApi();
  const { startTimer, stopTimer, resetTimer } = useQuizTimer();

  const [state, setState] = useState<QuizState>(() => {
    const persisted = loadEngine();
    return persisted?.state?.hasStarted
      ? normalizeQuizState(persisted.state)
      : INITIAL_QUIZ_STATE;
  });

  const [results, setResults] = useState<QuizResults>(() => {
    const persisted = loadEngine();
    return persisted?.state?.hasStarted
      ? persisted.results
      : INITIAL_QUIZ_RESULTS;
  });

  const [sessionContext, setSessionContext] = useState<SessionContext | null>(
    () => {
      const persisted = loadEngine();
      return persisted?.state?.hasStarted ? persisted.sessionContext : null;
    }
  );

  const stateRef = useRef(state);
  const resultsRef = useRef(results);

  const updateState = useCallback((patch: Partial<QuizState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const loadQuestionsIntoState = useCallback(
    (questions: QuizQuestion[]) => {
      if (questions.length === 0) return;
      const [first, ...rest] = questions;
      updateState({
        currentQuestion: first,
        queue: rest,
        totalToGenerate: questions.length,
        generatedCount: questions.length,
        isLoading: false,
        hasStarted: true,
        isReviewMode: false,
        answeredQuestionIds: [],
      });
      startTimer();
    },
    [updateState, startTimer]
  );

  const startQuiz = useCallback(
    async (userId: string, courseIdParam: string, chunkId?: string) => {
      const persisted = loadEngine();
      if (persisted?.state?.hasStarted) {
        setState(normalizeQuizState(persisted.state));
        setResults(persisted.results);
        setSessionContext(persisted.sessionContext);
        startTimer();
        return;
      }

      if (stateRef.current.isLoading || stateRef.current.hasStarted) return;

      updateState({ isLoading: true, error: null });

      try {
        const session = await api.startQuizSession(userId, courseIdParam);
        setSessionContext(session);

        const { pomodoroAdapter } =
          await import('@/shared/services/pomodoroAdapter');
        pomodoroAdapter.associateQuizWithPomodoro(
          session.sessionNumber.toString()
        );

        const queueQuestions = await api.loadQuestionsFromQueue(
          session,
          chunkId
        );
        const questions =
          queueQuestions.length > 0
            ? queueQuestions
            : chunkId
              ? await api.generateAndLoadQuestions(
                  userId,
                  session,
                  chunkId,
                  (count: number) => {
                    updateState({ generatedCount: count });
                  }
                )
              : await api.loadRandomQuestions(courseIdParam);

        if (questions.length > 0) {
          loadQuestionsIntoState(questions);
        } else {
          updateState({ isLoading: false, error: 'Soru bulunamadı.' });
        }
      } catch (error) {
        logger.error(
          'QuizEngineSession',
          'startQuiz',
          'Quiz başlatılamadı:',
          error as Error
        );
        updateState({
          isLoading: false,
          error: (error as Error).message,
        });
      }
    },
    [loadEngine, startTimer, updateState, api, loadQuestionsIntoState]
  );

  const resetState = useCallback(() => {
    setState(INITIAL_QUIZ_STATE);
    setResults(INITIAL_QUIZ_RESULTS);
    setSessionContext(null);
    resetTimer();
    clearEngine();
  }, [resetTimer, clearEngine]);

  useEffect(() => {
    stateRef.current = state;
    resultsRef.current = results;
  }, [state, results]);

  useEffect(() => {
    if (state.hasStarted) {
      saveEngine(state, results, sessionContext);
    }
  }, [state, results, sessionContext, saveEngine]);

  const progressIndex =
    state.generatedCount - state.queue.length - (state.currentQuestion ? 1 : 0);

  return useMemo(
    () => ({
      state,
      results,
      sessionContext,
      stateRef,
      resultsRef,
      startQuiz,
      updateState,
      setState,
      setResults,
      resetState,
      startTimer,
      stopTimer,
      resetTimer,
      progressIndex,
    }),
    [
      state,
      results,
      sessionContext,
      startQuiz,
      updateState,
      resetState,
      startTimer,
      stopTimer,
      resetTimer,
      progressIndex,
    ]
  );
}
