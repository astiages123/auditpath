import { createContext, useContext } from 'react';
import {
  SessionInfo,
  QuotaInfo,
  ReviewItem,
  CourseStats,
  QuizResponseType,
} from '../../core/types';

export interface QuizSessionState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  sessionInfo: SessionInfo | null;
  quotaInfo: QuotaInfo | null;
  reviewQueue: ReviewItem[]; // Full queue (flattened)
  batches: ReviewItem[][]; // Batched queue
  currentBatchIndex: number; // Index of the current batch (0-based)
  totalBatches: number; // Total number of batches
  currentReviewIndex: number;
  isReviewPhase: boolean;
  courseStats: CourseStats | null;
}

export interface QuizSessionContextValue {
  state: QuizSessionState;
  initializeSession: (courseId: string) => Promise<void>;
  recordResponse: (
    questionId: string,
    chunkId: string | null,
    responseType: QuizResponseType,
    selectedAnswer: number | null,

    timeSpentMs: number,
    diagnosis?: string,
    insight?: string
  ) => Promise<{
    isTopicRefreshed: boolean;
    isChainBonusApplied?: boolean;
  } | void>;
  getNextReviewItem: () => ReviewItem | null;
  markReviewComplete: () => void;
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
