import { useCallback, useState } from 'react';
import {
  QuizQuestion,
  QuizResults,
  QuizState,
  SessionContext,
} from '@/features/quiz/types';
import {
  calculateInitialResults,
  calculateTestResults,
} from '@/features/quiz/logic/quizCoreLogic';
import { useQuizTimer } from './useQuizTimer';
import { useQuizSessionControls, useQuizSubmission } from './useQuizSession';

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
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(
    null
  );

  const updateState = useCallback((patch: Partial<QuizState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const { startTimer, stopTimer, resetTimer } = useQuizTimer();

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

  const { startQuiz } = useQuizSessionControls({
    updateState,
    loadQuestionsIntoState,
    _resetTimer: resetTimer,
    setSessionContext,
  });

  const { submitAnswer } = useQuizSubmission({
    currentQuestion: state.currentQuestion,
    sessionContext,
    selectedAnswer: state.selectedAnswer,
    isAnswered: state.isAnswered,
    setResults,
    updateState,
    stopTimer,
  });

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
    setSessionContext(null);
    resetTimer();
  }, [resetTimer]);

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
      resetTimer();
      startTimer();
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
  }, [state, results, updateState, resetTimer, startTimer]);

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
