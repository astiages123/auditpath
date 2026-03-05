import { type QuizQuestion, type QuizResults, type QuizState } from '../types';
import { calculateTestResults } from './quizCalculations';

// === SECTION: State Transition Helpers ===

/**
 * Bir sonraki soruya geçiş için durumu günceller.
 */
export const calculateNextQuestionState = (
  state: QuizState,
  results: QuizResults
): Partial<QuizState> => {
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
        },
      ]
    : state.history;

  return {
    currentQuestion: nextQuestion,
    queue: remainingQueue,
    history: newHistory,
    selectedAnswer: null,
    isAnswered: false,
    showExplanation: false,
    isCorrect: null,
    lastSubmissionResult: null,
  };
};

/**
 * Önceki soruya (geçmişe) dönüş için durumu günceller.
 */
export const calculatePreviousQuestionState = (
  state: QuizState
): Partial<QuizState> => {
  if (state.history.length === 0) return {};

  const history = [...state.history];
  const lastItem = history.pop();

  if (!lastItem) return {};

  // Mevcut soruyu kuyruğa geri ekle (eğer varsa)
  const newQueue = state.currentQuestion
    ? [state.currentQuestion, ...state.queue]
    : state.queue;

  return {
    currentQuestion: lastItem as QuizQuestion,
    queue: newQueue,
    history,
    selectedAnswer: lastItem.userAnswer,
    isAnswered: false,
    showExplanation: false,
    isCorrect: null,
  };
};
