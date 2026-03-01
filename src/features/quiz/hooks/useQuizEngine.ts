import { useCallback, useEffect, useRef, useState } from 'react';
import {
  QuizQuestion,
  QuizResponseType,
  QuizResults,
  QuizState,
  SessionContext,
} from '@/features/quiz/types';
import {
  calculateInitialResults,
  updateResults,
} from '@/features/quiz/logic/quizCoreLogic';
import { MASTERY_THRESHOLD } from '@/features/quiz/utils/constants';
import { usePomodoroSessionStore } from '@/features/pomodoro/store';
import { useCelebrationStore } from '@/features/achievements/store';
import { useQuotaStore } from '@/features/quiz/store';
import { useQuizPersistence } from './useQuizPersistence';
import { useQuizTimer } from './useQuizTimer';
import { useQuizEngineApi } from './useQuizEngineApi';
import {
  calculateNextQuestionState,
  calculatePreviousQuestionState,
} from '@/features/quiz/logic/quizEngineHelpers';

const INITIAL_QUIZ_STATE: QuizState = {
  currentQuestion: null,
  queue: [],
  totalToGenerate: 0,
  generatedCount: 0,
  isLoading: false,
  error: null,
  selectedAnswer: null,
  isAnswered: false,
  showExplanation: false,
  isCorrect: null,
  hasStarted: false,
  summary: null,
  lastSubmissionResult: null,
  history: [],
};

export interface UseQuizEngineReturn {
  state: QuizState;
  results: QuizResults;
  progressIndex: number;
  startQuiz: (
    userId: string,
    courseId: string,
    chunkId?: string
  ) => Promise<void>;
  selectAnswer: (index: number) => void;
  submitAnswer: (type?: QuizResponseType) => Promise<void>;
  nextQuestion: () => void;
  previousQuestion: () => void;
  toggleExplanation: () => void;
  resetState: () => void;
}

export function useQuizEngine(courseId: string): UseQuizEngineReturn {
  const { loadEngine, saveEngine, clearEngine } = useQuizPersistence(courseId);
  const api = useQuizEngineApi();
  const { startTimer, stopTimer, resetTimer } = useQuizTimer();

  // Initialize state from persistence if available
  const [state, setState] = useState<QuizState>(() => {
    const persisted = loadEngine();
    return persisted?.state?.hasStarted ? persisted.state : INITIAL_QUIZ_STATE;
  });

  const [results, setResults] = useState<QuizResults>(() => {
    const persisted = loadEngine();
    return persisted?.state?.hasStarted
      ? persisted.results
      : calculateInitialResults();
  });

  const [sessionContext, setSessionContext] = useState<SessionContext | null>(
    () => {
      const persisted = loadEngine();
      return persisted?.state?.hasStarted ? persisted.sessionContext : null;
    }
  );

  const stateRef = useRef(state);
  const resultsRef = useRef(results);

  // Sync refs with state after render
  useEffect(() => {
    stateRef.current = state;
    resultsRef.current = results;
  }, [state, results]);

  // Save changes
  useEffect(() => {
    if (state.hasStarted) {
      saveEngine(state, results, sessionContext);
    }
  }, [state, results, sessionContext, saveEngine]);

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
      });
      startTimer();
    },
    [updateState, startTimer]
  );

  const startQuiz = useCallback(
    async (userId: string, courseIdParam: string, chunkId?: string) => {
      const persisted = loadEngine();
      if (persisted && persisted.state && persisted.state.hasStarted) {
        setState(persisted.state);
        setResults(persisted.results);
        setSessionContext(persisted.sessionContext);
        startTimer();
        return;
      }

      updateState({ isLoading: true, error: null });

      try {
        const session = await api.startQuizSession(userId, courseIdParam);
        setSessionContext(session);
        usePomodoroSessionStore
          .getState()
          .setSessionId(session.sessionNumber.toString());

        let questions: QuizQuestion[] = [];
        const queueQuestions = await api.loadQuestionsFromQueue(
          session,
          chunkId
        );

        if (queueQuestions.length > 0) {
          questions = queueQuestions;
        } else if (chunkId) {
          questions = await api.generateAndLoadQuestions(
            userId,
            session,
            chunkId,
            (count: number) => {
              updateState({ generatedCount: count });
            }
          );
        } else {
          questions = await api.loadRandomQuestions(courseIdParam);
        }

        if (questions.length > 0) {
          loadQuestionsIntoState(questions);
        } else {
          updateState({ isLoading: false, error: 'Soru bulunamadı.' });
        }
      } catch (e: unknown) {
        const error = e as Error;
        updateState({ isLoading: false, error: error.message });
      }
    },
    [updateState, loadQuestionsIntoState, loadEngine, startTimer, api]
  );

  const submitAnswer = useCallback(
    async (type: QuizResponseType = 'correct') => {
      const currentState = stateRef.current;
      if (
        currentState.isAnswered ||
        !currentState.currentQuestion ||
        !sessionContext
      ) {
        return;
      }

      const actualType =
        type === 'correct'
          ? currentState.selectedAnswer === currentState.currentQuestion.a
            ? 'correct'
            : 'incorrect'
          : type;

      const timeSpent = stopTimer();

      const previousState = { ...currentState };
      const previousResults = { ...resultsRef.current };

      setResults((prev) =>
        updateResults(prev, actualType as QuizResponseType, timeSpent)
      );

      updateState({
        isAnswered: true,
        isCorrect: actualType === 'correct',
        showExplanation: actualType !== 'blank',
      });

      try {
        const result = await api.submitAnswer(
          sessionContext,
          currentState.currentQuestion.id!,
          currentState.currentQuestion.chunk_id || null,
          actualType as QuizResponseType,
          timeSpent,
          currentState.selectedAnswer
        );

        updateState({ lastSubmissionResult: result });

        if (
          result.newMastery >= MASTERY_THRESHOLD &&
          currentState.currentQuestion.chunk_id
        ) {
          useCelebrationStore.getState().enqueueCelebration({
            id: `MASTERY_${currentState.currentQuestion.chunk_id}_${result.newMastery}`,
            title: 'Uzmanlık Seviyesi!',
            description: `Bu konudaki ustalığın ${result.newMastery} puana ulaştı.`,
            variant: 'achievement',
          });
        }
        useQuotaStore.getState().decrementClientQuota();
      } catch {
        updateState({
          error: 'Soru gönderilirken bir hata oluştu. Lütfen tekrar deneyin.',
        });
        setState(previousState);
        setResults(previousResults);
        startTimer();
      }
    },
    [sessionContext, stopTimer, startTimer, updateState, api]
  );

  const resetState = useCallback(() => {
    setState(INITIAL_QUIZ_STATE);
    setResults(calculateInitialResults());
    setSessionContext(null);
    resetTimer();
    clearEngine();
  }, [resetTimer, clearEngine]);

  const selectAnswer = useCallback(
    (index: number) => {
      const currentState = stateRef.current;
      if (currentState.isAnswered || !currentState.currentQuestion) return;
      updateState({
        selectedAnswer: currentState.selectedAnswer === index ? null : index,
      });
    },
    [updateState]
  );

  const nextQuestion = useCallback(() => {
    const patch = calculateNextQuestionState(
      stateRef.current,
      resultsRef.current
    );
    updateState(patch);

    if (patch.queue) {
      resetTimer();
      startTimer();
    } else {
      clearEngine();
    }
  }, [updateState, resetTimer, startTimer, clearEngine]);

  const previousQuestion = useCallback(() => {
    const patch = calculatePreviousQuestionState(stateRef.current);
    if (patch) {
      updateState(patch);
    }
  }, [updateState]);

  const toggleExplanation = useCallback(() => {
    updateState({ showExplanation: !stateRef.current.showExplanation });
  }, [updateState]);

  const progressIndex =
    state.generatedCount - state.queue.length - (state.currentQuestion ? 1 : 0);

  return {
    state,
    results,
    progressIndex,
    startQuiz,
    selectAnswer,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    toggleExplanation,
    resetState,
  };
}
