import { calculateInitialResults } from '@/features/quiz/logic/quizCoreLogic';
import { QuizResults, QuizState } from '@/features/quiz/types';

export const INITIAL_QUIZ_STATE: QuizState = {
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

export const INITIAL_QUIZ_RESULTS: QuizResults = calculateInitialResults();

export const normalizeQuizState = (
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
