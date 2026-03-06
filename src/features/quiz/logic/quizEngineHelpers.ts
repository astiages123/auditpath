import {
  type QuizHistoryItem,
  type QuizResults,
  type QuizState,
} from '../types';
import { calculateTestResults } from './quizCalculations';

/**
 * Bir sonraki soruya geçiş için durumu günceller.
 */
export const calculateNextQuestionState = (
  state: QuizState,
  results: QuizResults
): Partial<QuizState> => {
  if (state.isReviewMode) {
    const [nextQuestion, ...remainingQueue] = state.queue;

    if (!nextQuestion) {
      return {
        currentQuestion: null,
        hasStarted: false,
        summary: calculateTestResults(
          results.correct,
          results.incorrect,
          results.blank,
          results.totalTimeMs
        ),
        isReviewMode: false,
      };
    }

    const historyEntry = state.history.find(
      (item) => item.id === nextQuestion.id
    );

    if (!historyEntry) {
      return {
        currentQuestion: nextQuestion,
        queue: remainingQueue,
        selectedAnswer: null,
        isAnswered: false,
        showExplanation: false,
        isCorrect: null,
        lastSubmissionResult: null,
        isReviewMode: false,
      };
    }

    return {
      currentQuestion: historyEntry,
      queue: remainingQueue,
      selectedAnswer: historyEntry.userAnswer,
      isAnswered: true,
      showExplanation: historyEntry.responseType !== 'blank',
      isCorrect: historyEntry.isCorrect,
      lastSubmissionResult: null,
      isReviewMode: true,
    };
  }

  if (state.queue.length === 0) {
    return {
      currentQuestion: null,
      hasStarted: false,
      summary: calculateTestResults(
        results.correct,
        results.incorrect,
        results.blank,
        results.totalTimeMs
      ),
    };
  }

  const [nextQuestion, ...remainingQueue] = state.queue;

  // Mevcut soruyu geçmişe ekle
  const newHistory = state.currentQuestion
    ? [
        ...state.history,
        {
          ...state.currentQuestion,
          userAnswer: state.selectedAnswer,
          isCorrect: state.isCorrect,
          responseType:
            state.isCorrect === true
              ? 'correct'
              : state.selectedAnswer === null
                ? 'blank'
                : 'incorrect',
        } satisfies QuizHistoryItem,
      ]
    : state.history;

  return {
    currentQuestion: nextQuestion,
    queue: remainingQueue,
    history: newHistory,
    answeredQuestionIds:
      state.currentQuestion?.id &&
      !state.answeredQuestionIds.includes(state.currentQuestion.id)
        ? [...state.answeredQuestionIds, state.currentQuestion.id]
        : state.answeredQuestionIds,
    selectedAnswer: null,
    isAnswered: false,
    showExplanation: false,
    isCorrect: null,
    lastSubmissionResult: null,
    isReviewMode: false,
  };
};

/**
 * Önceki soruya (geçmişe) dönüş için durumu günceller.
 */
export const calculatePreviousQuestionState = (
  state: QuizState
): Partial<QuizState> => {
  if (state.history.length === 0) return {};

  const previousHistoryIndex = state.isReviewMode
    ? state.history.findIndex((item) => item.id === state.currentQuestion?.id) -
      1
    : state.history.length - 1;

  const lastHistoryItem = state.history[previousHistoryIndex];
  if (!lastHistoryItem) return {};

  // Mevcut soruyu kuyruğa geri ekle (eğer varsa)
  const newQueue = state.currentQuestion
    ? [state.currentQuestion, ...state.queue]
    : state.queue;

  return {
    currentQuestion: lastHistoryItem,
    queue: newQueue,
    history: state.history,
    selectedAnswer: lastHistoryItem.userAnswer,
    isAnswered: true,
    showExplanation: lastHistoryItem.responseType !== 'blank',
    isCorrect: lastHistoryItem.isCorrect,
    isReviewMode: true,
  };
};
