import { createContext } from 'react';
import type {
  QuizSessionState,
  QuizResponseType,
  ReviewItem,
} from '@/features/quiz/types';

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
