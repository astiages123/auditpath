import { useCallback, useReducer } from 'react';
import {
  getCourseStats,
  getQuotaInfo,
  getReviewQueue,
  getSessionInfo,
  submitQuizAnswer,
} from '@/features/quiz/services/quizService';
import { storage } from '@/shared/services/storageService';
import { QuizResponseType, ReviewItem } from '@/features/quiz/types';
import { logger } from '@/utils/logger';
import { useAuth } from '@/features/auth/hooks/useAuth';

const STORAGE_PREFIX = 'auditpath_quiz_session_';

interface SessionState {
  status:
    | 'IDLE'
    | 'INITIALIZING'
    | 'READY'
    | 'PLAYING'
    | 'INTERMISSION'
    | 'FINISHED'
    | 'ERROR';
  sessionInfo: {
    currentSession: number;
    totalSessions: number;
    courseId: string;
  } | null;
  quotaInfo: { reviewQuota: number } | null;
  reviewQueue: ReviewItem[];
  currentReviewIndex: number;
  courseStats: { totalQuestionsSolved: number } | null;
  error: string | null;
  isSyncing: boolean;
}

const INITIAL_STATE: SessionState = {
  status: 'IDLE',
  sessionInfo: null,
  quotaInfo: null,
  reviewQueue: [],
  currentReviewIndex: 0,
  courseStats: null,
  error: null,
  isSyncing: false,
};

type SessionAction =
  | { type: 'SET_STATUS'; payload: SessionState['status'] }
  | { type: 'SET_ERROR'; payload: string }
  | {
      type: 'INITIALIZE';
      payload: {
        sessionInfo: SessionState['sessionInfo'];
        quotaInfo: SessionState['quotaInfo'];
        reviewQueue: ReviewItem[];
        courseStats: SessionState['courseStats'];
      };
    }
  | {
      type: 'ANSWER_QUESTION';
      payload: { questionId: string; answerIndex: number; isCorrect: boolean };
    }
  | { type: 'NEXT_QUESTION' }
  | { type: 'PREV_QUESTION' }
  | { type: 'SYNC_COMPLETE' }
  | { type: 'RESET' };

function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_ERROR':
      return {
        ...state,
        status: 'ERROR',
        error: action.payload,
        isSyncing: false,
      };
    case 'INITIALIZE':
      return {
        ...state,
        status: 'READY',
        sessionInfo: action.payload.sessionInfo,
        quotaInfo: action.payload.quotaInfo,
        reviewQueue: action.payload.reviewQueue,
        courseStats: action.payload.courseStats,
        error: null,
        isSyncing: false,
      };
    case 'ANSWER_QUESTION': {
      const newCourseStats = state.courseStats
        ? { totalQuestionsSolved: state.courseStats.totalQuestionsSolved + 1 }
        : { totalQuestionsSolved: 1 };
      return { ...state, courseStats: newCourseStats, isSyncing: true };
    }
    case 'NEXT_QUESTION': {
      const nextIndex = state.currentReviewIndex + 1;
      if (nextIndex >= state.reviewQueue.length)
        return { ...state, status: 'FINISHED', currentReviewIndex: nextIndex };
      return { ...state, currentReviewIndex: nextIndex, status: 'PLAYING' };
    }
    case 'PREV_QUESTION':
      return {
        ...state,
        currentReviewIndex: Math.max(0, state.currentReviewIndex - 1),
        status: 'PLAYING',
      };
    case 'SYNC_COMPLETE':
      return { ...state, isSyncing: false };
    case 'RESET':
      return INITIAL_STATE;
    default:
      return state;
  }
}

export interface UseQuizSessionReturn {
  state: SessionState;
  initializeSession: (courseId: string) => Promise<void>;
  recordResponse: (
    questionId: string,
    chunkId: string | null,
    responseType: QuizResponseType,
    selectedAnswer: number | null,
    timeSpentMs: number
  ) => Promise<void>;
  nextQuestion: () => void;
  prevQuestion: () => void;
  resetSession: () => void;
}

export function useQuizSession(): UseQuizSessionReturn {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(sessionReducer, INITIAL_STATE);

  const initializeSession = useCallback(
    async (courseId: string) => {
      dispatch({ type: 'SET_STATUS', payload: 'INITIALIZING' });
      if (!user?.id) {
        dispatch({
          type: 'SET_ERROR',
          payload: 'Kullanıcı oturumu bulunamadı',
        });
        return;
      }
      try {
        const [sessionInfo, quotaInfo, courseStats] = await Promise.all([
          getSessionInfo(user.id, courseId),
          getQuotaInfo(user.id, courseId),
          getCourseStats(user.id, courseId),
        ]);
        if (!sessionInfo) throw new Error('Seans bilgisi alınamadı');

        const storageKey = `${STORAGE_PREFIX}${user.id}_${courseId}`;
        const queueKey = `${storageKey}_queue`;
        const savedSession = storage.get<{
          sessionId: number;
          currentReviewIndex?: number;
        }>(storageKey);
        let reviewQueue: ReviewItem[] = [];

        if (
          savedSession &&
          savedSession.sessionId === sessionInfo.currentSession
        ) {
          const savedQueue = storage.get<ReviewItem[]>(queueKey);
          if (savedQueue) reviewQueue = savedQueue;
        } else {
          reviewQueue = await getReviewQueue(
            {
              userId: user.id,
              courseId,
              sessionNumber: sessionInfo.currentSession,
              isNewSession: false,
              courseName: '',
            },
            quotaInfo.reviewQuota
          );
        }
        dispatch({
          type: 'INITIALIZE',
          payload: { sessionInfo, quotaInfo, reviewQueue, courseStats },
        });
      } catch (err) {
        logger.error('[QuizSession] Initialization error:', err as Error);
        dispatch({
          type: 'SET_ERROR',
          payload: err instanceof Error ? err.message : 'Bilinmeyen hata',
        });
      }
    },
    [user?.id]
  );

  const recordResponse = useCallback(
    async (
      questionId: string,
      chunkId: string | null,
      responseType: QuizResponseType,
      selectedAnswer: number | null,
      timeSpentMs: number
    ) => {
      if (!user?.id || !state.sessionInfo) return;
      dispatch({
        type: 'ANSWER_QUESTION',
        payload: {
          questionId,
          answerIndex: selectedAnswer ?? -1,
          isCorrect: responseType === 'correct',
        },
      });
      try {
        await submitQuizAnswer(
          {
            userId: user.id,
            courseId: state.sessionInfo.courseId,
            sessionNumber: state.sessionInfo.currentSession,
          },
          questionId,
          chunkId,
          responseType,
          timeSpentMs,
          selectedAnswer
        );
        dispatch({ type: 'SYNC_COMPLETE' });
      } catch (err) {
        logger.error('[QuizSession] Error recording response:', err as Error);
        dispatch({ type: 'SYNC_COMPLETE' });
      }
    },
    [user?.id, state]
  );

  const nextQuestion = useCallback(
    () => dispatch({ type: 'NEXT_QUESTION' }),
    []
  );
  const prevQuestion = useCallback(
    () => dispatch({ type: 'PREV_QUESTION' }),
    []
  );
  const resetSession = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    state,
    initializeSession,
    recordResponse,
    nextQuestion,
    prevQuestion,
    resetSession,
  };
}
