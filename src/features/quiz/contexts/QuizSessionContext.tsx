import { createContext, useContext } from 'react';
import { SessionInfo, QuotaInfo, ReviewItem } from '@/features/quiz/modules/srs';
import { CourseStats } from '@/features/statistics/services/srs-stats';
import { QuizResponseType } from '@/features/quiz/modules/srs/srs-algorithm';

export interface QuizSessionState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  sessionInfo: SessionInfo | null;
  quotaInfo: QuotaInfo | null;
  reviewQueue: ReviewItem[];
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
    timeSpentMs: number
  ) => Promise<void>;
  getNextReviewItem: () => ReviewItem | null;
  markReviewComplete: () => void;
}

export const QuizSessionContext = createContext<QuizSessionContextValue | null>(null);

export function useQuizSession() {
  const context = useContext(QuizSessionContext);
  if (!context) {
    throw new Error('useQuizSession must be used within a QuizSessionProvider');
  }
  return context;
}
