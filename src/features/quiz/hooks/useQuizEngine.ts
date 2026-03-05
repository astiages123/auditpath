import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { logger } from '@/utils/logger';
import { useCelebrationStore } from '@/features/achievements/store';
import { useQuotaStore } from '@/features/quiz/store';
import { useQuizPersistence } from './useQuizPersistence';
import { useQuizTimer } from './useQuizTimer';
import { useQuizEngineApi } from './useQuizEngineApi';
import {
  calculateNextQuestionState,
  calculatePreviousQuestionState,
} from '@/features/quiz/logic/quizEngineHelpers';

// ============================================================================
// CONSTANTS
// ============================================================================

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
  currentMastery: 0,
  lastSubmissionResult: null,
  isReviewMode: false,
  answeredQuestionIds: [],
  history: [],
};

const normalizeState = (
  persistedState: QuizState | null | undefined
): QuizState =>
  persistedState
    ? {
        ...INITIAL_QUIZ_STATE,
        ...persistedState,
        isReviewMode: persistedState.isReviewMode ?? false,
        answeredQuestionIds: persistedState.answeredQuestionIds ?? [],
        history: persistedState.history ?? [],
      }
    : INITIAL_QUIZ_STATE;

// ============================================================================
// TYPES
// ============================================================================

export interface UseQuizEngineReturn {
  /** Mevcut quiz durumu */
  state: QuizState;
  /** Oturum sonuçları */
  results: QuizResults;
  /** İlerleme indeksi (0-toplam) */
  progressIndex: number;
  /** Sınavı başlatır */
  startQuiz: (
    userId: string,
    courseId: string,
    chunkId?: string
  ) => Promise<void>;
  /** Seçenek seçer */
  selectAnswer: (index: number) => void;
  /** Cevabı gönderir */
  submitAnswer: (type?: QuizResponseType) => Promise<void>;
  /** Sonraki soruya geçer */
  nextQuestion: () => void;
  /** Önceki soruya döner */
  previousQuestion: () => void;
  /** Açıklama panelini açar/kapatır */
  toggleExplanation: () => void;
  /** Durumu sıfırlar */
  resetState: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Quiz çözüm sürecini (motorunu) yöneten ana hook.
 * Soru yükleme, cevaplama, ilerleme ve zamanlayıcı yönetimini koordine eder.
 *
 * @param courseId - Kursun ID'si
 * @returns {UseQuizEngineReturn} Motor durumu ve aksiyon fonksiyonları
 */
export function useQuizEngine(courseId: string): UseQuizEngineReturn {
  // === EXTERNAL HOOKS ===
  const { loadEngine, saveEngine, clearEngine } = useQuizPersistence(courseId);
  const api = useQuizEngineApi();
  const { startTimer, stopTimer, resetTimer } = useQuizTimer();

  // === STATE ===

  // Initialize state from persistence if available
  const [state, setState] = useState<QuizState>(() => {
    const persisted = loadEngine();
    return persisted?.state?.hasStarted
      ? normalizeState(persisted.state)
      : INITIAL_QUIZ_STATE;
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

  // Sync state and results for use in callbacks without stale closures
  const stateRef = useRef(state);
  const resultsRef = useRef(results);

  // === HELPERS ===

  /** State güncelleyici yardımcı */
  const updateState = useCallback((patch: Partial<QuizState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  /** Soruları state'e yükler ve zamanlayıcıyı başlatır */
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

  // === ACTIONS ===

  /**
   * Quiz oturumunu başlatır. Mevcut bir oturum varsa onu yükler.
   */
  const startQuiz = useCallback(
    async (userId: string, courseIdParam: string, chunkId?: string) => {
      const persisted = loadEngine();
      if (persisted && persisted.state && persisted.state.hasStarted) {
        setState(normalizeState(persisted.state));
        setResults(persisted.results);
        setSessionContext(persisted.sessionContext);
        startTimer();
        return;
      }

      if (state.isLoading || state.hasStarted) return;

      updateState({ isLoading: true, error: null });

      try {
        const session = await api.startQuizSession(userId, courseIdParam);
        setSessionContext(session);

        // Pomodoro oturumuyla bağdaştır
        const { pomodoroAdapter } =
          await import('@/shared/services/pomodoroAdapter');
        pomodoroAdapter.associateQuizWithPomodoro(
          session.sessionNumber.toString()
        );

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
        console.error('[useQuizEngine][startQuiz] Hata:', error);
        logger.error('QuizEngine', 'startQuiz', 'Quiz başlatılamadı:', error);
        updateState({ isLoading: false, error: error.message });
      }
    },
    [
      updateState,
      loadQuestionsIntoState,
      loadEngine,
      startTimer,
      api,
      state.isLoading,
      state.hasStarted,
    ]
  );

  /**
   * Mevcut sorunun cevabını veritabanına gönderir.
   */
  const submitAnswer = useCallback(
    async (type: QuizResponseType = 'correct') => {
      const currentState = stateRef.current;
      if (
        currentState.isAnswered ||
        currentState.isReviewMode ||
        !currentState.currentQuestion ||
        !sessionContext
      ) {
        return;
      }

      // Cevap tipini belirle
      const actualType =
        type === 'correct'
          ? currentState.selectedAnswer === currentState.currentQuestion.a
            ? 'correct'
            : 'incorrect'
          : type;

      const timeSpent = stopTimer();

      // Hata durumunda rollback için yedekle
      const previousState = { ...currentState };
      const previousResults = { ...resultsRef.current };

      // UI'yı anında güncelle (Optimistic UI)
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

        updateState({
          lastSubmissionResult: result,
          currentMastery: result.newMastery,
        });

        // Yanlış cevap durumunda follow-up üretimi (Arka planda)
        if (actualType === 'incorrect' && result.progressId) {
          import('@/features/quiz/services/followUpService')
            .then(({ generateFollowUpForWrongAnswer }) => {
              generateFollowUpForWrongAnswer(
                result.progressId!,
                currentState.currentQuestion?.id || '',
                currentState.selectedAnswer,
                sessionContext.userId,
                sessionContext.courseId,
                sessionContext.sessionNumber
              ).catch(() => {});
            })
            .catch((err) => {
              console.error(
                '[useQuizEngine][submitAnswer] Follow-up yükleme hatası:',
                err
              );
              logger.error(
                'QuizEngine',
                'submitAnswer',
                'Failed to load followUpService',
                err
              );
            });
        }

        // Mastery eşiği geçildiyse kutlama tetikle
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

        // Kotayı düşür
        useQuotaStore.getState().decrementClientQuota();
      } catch (err) {
        console.error('[useQuizEngine][submitAnswer] Hata:', err);
        logger.error('QuizEngine', 'submitAnswer', 'Hata:', err as Error);
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

  /** Tüm motor durumunu temizler ve sıfırlar */
  const resetState = useCallback(() => {
    setState(INITIAL_QUIZ_STATE);
    setResults(calculateInitialResults());
    setSessionContext(null);
    resetTimer();
    clearEngine();
  }, [resetTimer, clearEngine]);

  /** Bir seçeneği seçer/iptal eder */
  const selectAnswer = useCallback(
    (index: number) => {
      const currentState = stateRef.current;
      if (
        currentState.isAnswered ||
        currentState.isReviewMode ||
        !currentState.currentQuestion
      ) {
        return;
      }
      updateState({
        selectedAnswer: currentState.selectedAnswer === index ? null : index,
      });
    },
    [updateState]
  );

  /** Bir sonraki soruya ilerler veya sınavı bitirir */
  const nextQuestion = useCallback(() => {
    const patch = calculateNextQuestionState(
      stateRef.current,
      resultsRef.current
    );
    updateState(patch);

    if (patch.queue) {
      if (patch.isReviewMode) {
        stopTimer();
      } else {
        resetTimer();
        startTimer();
      }
    } else {
      clearEngine();
    }
  }, [updateState, resetTimer, startTimer, stopTimer, clearEngine]);

  /** Bir önceki soruya döner */
  const previousQuestion = useCallback(() => {
    const patch = calculatePreviousQuestionState(stateRef.current);
    if (patch) {
      stopTimer();
      updateState(patch);
    }
  }, [updateState, stopTimer]);

  /** Açıklama panelini açar/kapatır */
  const toggleExplanation = useCallback(() => {
    updateState({ showExplanation: !stateRef.current.showExplanation });
  }, [updateState]);

  // === SIDE EFFECTS ===

  // Sync refs with state after render
  useEffect(() => {
    stateRef.current = state;
    resultsRef.current = results;
  }, [state, results]);

  // Save state changes to persistence
  useEffect(() => {
    if (state.hasStarted) {
      saveEngine(state, results, sessionContext);
    }
  }, [state, results, sessionContext, saveEngine]);

  // === CALCULATIONS ===

  const progressIndex =
    state.generatedCount - state.queue.length - (state.currentQuestion ? 1 : 0);

  // === RETURN ===
  return useMemo(
    () => ({
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
    }),
    [
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
    ]
  );
}
