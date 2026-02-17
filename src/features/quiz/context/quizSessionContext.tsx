import { createContext, useContext } from 'react';
import {
  type ReviewItem,
  type QuizResponseType,
  type QuizSessionState,
} from '@/features/quiz/types/quizTypes';

export interface QuizSessionContextValue {
  state: QuizSessionState;
  initializeSession: (courseId: string) => Promise<void>;
  recordResponse: (
    questionId: string,
    chunkId: string | null,
    responseType: QuizResponseType,
    selectedAnswer: number | null,
    timeSpentMs: number
  ) => Promise<{
    isTopicRefreshed: boolean;
    isChainBonusApplied?: boolean;
  } | void>;
  getNextReviewItem: () => ReviewItem | null;
  markReviewComplete: () => void;
  prevQuestion: () => void;
  advanceBatch: () => void;
  injectScaffolding: (questionId: string, chunkId: string) => void;
}

export const QuizSessionContext = createContext<QuizSessionContextValue | null>(
  null
);

export function useQuizSession() {
  const context = useContext(QuizSessionContext);
  if (!context) {
    throw new Error('useQuizSession must be used within a QuizSessionProvider');
  }
  return context;
}
