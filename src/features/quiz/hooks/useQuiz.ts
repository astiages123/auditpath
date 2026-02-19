import { useCallback, useRef, useState } from 'react';
import {
  QuizQuestion,
  QuizResponseType,
  QuizResults,
  QuizState,
  SessionContext,
  TrueFalseQuestion,
  MultipleChoiceQuestion,
} from '@/features/quiz/types';
import {
  calculateInitialResults,
  calculateTestResults,
  updateResults,
} from '@/features/quiz/logic/quizLogic';
import { createTimer } from '@/features/quiz/logic/quizTimer';
import {
  fetchQuestionsByIds,
  getReviewQueue,
  startQuizSession,
  submitQuizAnswer,
} from '@/features/quiz/services/quizService';
import { generateForChunk } from '@/features/quiz/logic/quizLogic';
import { usePomodoroSessionStore } from '@/features/pomodoro/store';
import { useCelebrationStore } from '@/features/achievements/store';
import { useQuotaStore } from '@/features/quiz/store';
import { MASTERY_THRESHOLD } from '@/features/quiz/utils/constants';

export function useQuiz() {
  const [state, setState] = useState<QuizState>({
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
  });

  const [results, setResults] = useState<QuizResults>(
    calculateInitialResults()
  );
  const timerRef = useRef(createTimer());
  const sessionContextRef = useRef<SessionContext | null>(null);

  const updateState = useCallback((patch: Partial<QuizState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetState = useCallback(() => {
    setState({
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
    });
    setResults(calculateInitialResults());
    timerRef.current.reset();
  }, []);

  // --- Initialization ---
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
    },
    [updateState]
  );

  const startQuiz = useCallback(
    async (userId: string, courseId: string, chunkId?: string) => {
      updateState({ isLoading: true, error: null });
      try {
        const session = await startQuizSession(userId, courseId);
        sessionContextRef.current = session;
        usePomodoroSessionStore
          .getState()
          .setSessionId(session.sessionNumber.toString());

        const queue = await getReviewQueue(session, 10, chunkId);
        if (queue.length > 0) {
          const questions = await fetchQuestionsByIds(
            queue.map((i) => i.questionId)
          );
          loadQuestionsIntoState(
            questions.map((q) => {
              const qd = q.question_data as
                | TrueFalseQuestion
                | MultipleChoiceQuestion;
              return {
                ...qd,
                id: q.id,
              } as QuizQuestion;
            })
          );
        } else if (chunkId) {
          await generateForChunk(
            chunkId,
            {
              onLog: () => {},
              onTotalTargetCalculated: () => {},
              onQuestionSaved: (count) =>
                updateState({ generatedCount: count }),
              onComplete: async () => {
                const newQueue = await getReviewQueue(session, 10, chunkId);
                const newQs = await fetchQuestionsByIds(
                  newQueue.map((i) => i.questionId)
                );
                loadQuestionsIntoState(
                  newQs.map((q) => {
                    const qd = q.question_data as
                      | TrueFalseQuestion
                      | MultipleChoiceQuestion;
                    return {
                      ...qd,
                      id: q.id,
                    } as QuizQuestion;
                  })
                );
              },
              onError: (err) => updateState({ error: err, isLoading: false }),
            },
            { usageType: 'antrenman', userId }
          );
        } else {
          updateState({ isLoading: false, error: 'Soru bulunamadı.' });
        }
      } catch (e: unknown) {
        const error = e as Error;
        updateState({ isLoading: false, error: error.message });
      }
    },
    [updateState, loadQuestionsIntoState]
  );

  // --- User Actions ---
  const selectAnswer = useCallback(
    (index: number) => {
      if (state.isAnswered || !state.currentQuestion) return;
      updateState({
        selectedAnswer: state.selectedAnswer === index ? null : index,
      });
    },
    [state.isAnswered, state.currentQuestion, state.selectedAnswer, updateState]
  );

  const submitAnswer = useCallback(
    async (type: QuizResponseType = 'correct') => {
      if (
        state.isAnswered ||
        !state.currentQuestion ||
        !sessionContextRef.current
      )
        return;

      const actualType =
        type === 'correct'
          ? state.selectedAnswer === state.currentQuestion.a
            ? 'correct'
            : 'incorrect'
          : type;
      const timeSpent = timerRef.current.stop();

      setResults((prev) =>
        updateResults(prev, actualType as QuizResponseType, timeSpent)
      );
      updateState({
        isAnswered: true,
        isCorrect: actualType === 'correct',
        showExplanation: actualType !== 'blank',
      });

      const result = await submitQuizAnswer(
        sessionContextRef.current,
        state.currentQuestion.id!,
        state.currentQuestion.chunk_id || null,
        actualType as QuizResponseType,
        timeSpent,
        state.selectedAnswer
      );

      updateState({ lastSubmissionResult: result });

      if (
        result.newMastery >= MASTERY_THRESHOLD &&
        state.currentQuestion.chunk_id
      ) {
        useCelebrationStore.getState().enqueueCelebration({
          id: `MASTERY_${state.currentQuestion.chunk_id}_${result.newMastery}`,
          title: 'Uzmanlık Seviyesi!',
          description: `Bu konudaki ustalığın ${result.newMastery} puana ulaştı.`,
          variant: 'achievement',
        });
      }
      useQuotaStore.getState().decrementQuota();
    },
    [
      state.isAnswered,
      state.currentQuestion,
      state.selectedAnswer,
      updateState,
      setResults,
    ]
  );

  const nextQuestion = useCallback(() => {
    const newHistory = [...state.history];
    if (state.currentQuestion && state.isAnswered) {
      newHistory.push({
        ...state.currentQuestion,
        userAnswer: state.selectedAnswer,
        isCorrect: state.isCorrect,
      });
    }

    if (state.queue.length > 0) {
      const [next, ...rest] = state.queue;
      updateState({
        currentQuestion: next,
        queue: rest,
        history: newHistory,
        selectedAnswer: null,
        isAnswered: false,
        showExplanation: false,
        isCorrect: null,
        lastSubmissionResult: null,
      });
      timerRef.current.reset();
      timerRef.current.start();
    } else {
      const summary = calculateTestResults(
        results.correct,
        results.incorrect,
        results.blank,
        results.totalTimeMs
      );
      updateState({
        summary,
        currentQuestion: null,
        history: newHistory,
        hasStarted: false,
      });
    }
  }, [state, results, updateState]);

  const previousQuestion = useCallback(() => {
    if (state.history.length === 0) return;
    const newHistory = [...state.history];
    const prev = newHistory.pop()!;
    const newQueue = state.currentQuestion
      ? [state.currentQuestion, ...state.queue]
      : state.queue;

    updateState({
      currentQuestion: prev,
      queue: newQueue,
      history: newHistory,
      selectedAnswer: prev.userAnswer,
      isAnswered: true,
      showExplanation: true,
      isCorrect: prev.isCorrect,
    });
  }, [state.currentQuestion, state.queue, state.history, updateState]);

  const toggleExplanation = useCallback(() => {
    updateState({ showExplanation: !state.showExplanation });
  }, [state.showExplanation, updateState]);

  // --- Progress Calculation ---
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
