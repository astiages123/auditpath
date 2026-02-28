import { QuizResults, QuizState } from '@/features/quiz/types';
import { calculateTestResults } from '@/features/quiz/logic/quizCoreLogic';

export function calculateNextQuestionState(
  state: QuizState,
  results: QuizResults
): Partial<QuizState> {
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
    return {
      currentQuestion: next,
      queue: rest,
      history: newHistory,
      selectedAnswer: null,
      isAnswered: false,
      showExplanation: false,
      isCorrect: null,
      lastSubmissionResult: null,
    };
  } else {
    const summary = calculateTestResults(
      results.correct,
      results.incorrect,
      results.blank,
      results.totalTimeMs
    );
    return {
      summary,
      currentQuestion: null,
      history: newHistory,
      hasStarted: false,
    };
  }
}

export function calculatePreviousQuestionState(
  state: QuizState
): Partial<QuizState> | null {
  if (state.history.length === 0) return null;
  const newHistory = [...state.history];
  const prev = newHistory.pop()!;
  const newQueue = state.currentQuestion
    ? [state.currentQuestion, ...state.queue]
    : state.queue;

  return {
    currentQuestion: prev,
    queue: newQueue,
    history: newHistory,
    selectedAnswer: prev.userAnswer,
    isAnswered: true,
    showExplanation: true,
    isCorrect: prev.isCorrect,
  };
}
