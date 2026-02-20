import { useCallback, useEffect, useReducer } from 'react';

import { QuizResponseType, ReviewItem } from '@/features/quiz/types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getCourseStats,
  getQuotaInfo,
  getReviewQueue,
  getSessionInfo,
  submitQuizAnswer as submitAnswer,
} from '@/features/quiz/services/quizService';
import { logger } from '@/utils/logger';
import { storage } from '@/shared/services/storageService';
import {
  createBatches,
  initialQuizSessionState,
  quizSessionReducer,
} from './quizReducer';

const STORAGE_PREFIX = 'auditpath_quiz_session_';

export function useQuizSessionState() {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(
    quizSessionReducer,
    initialQuizSessionState
  );

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

        if (!sessionInfo) {
          throw new Error('Seans bilgisi alınamadı');
        }

        // Content versioning removed as it was missing from services.
        /*
                if (contentVersion) {
                  ...
                }
                */

        const storageKey = `${STORAGE_PREFIX}${user.id}_${courseId}`;
        const queueKey = `${storageKey}_queue`;
        interface SavedSession {
          sessionId: number;
          currentReviewIndex?: number;
        }
        const savedSession = storage.get<SavedSession>(storageKey);
        let restoredQueue = false;
        let currentReviewIndex = 0;
        let reviewQueue: ReviewItem[] = [];

        if (savedSession) {
          try {
            if (savedSession.sessionId === sessionInfo.currentSession) {
              const savedQueue = storage.get<ReviewItem[]>(queueKey);
              if (savedQueue) {
                reviewQueue = savedQueue;
                currentReviewIndex = savedSession.currentReviewIndex || 0;
                restoredQueue = true;
              }
            } else {
              storage.remove(storageKey);
              storage.remove(queueKey);
            }
          } catch (e) {
            logger.error(
              '[QuizSession] Error parsing saved session',
              e as Error
            );
            storage.remove(storageKey);
            storage.remove(queueKey);
          }
        }

        if (!restoredQueue) {
          reviewQueue = await getReviewQueue(
            {
              userId: user.id,
              courseId: courseId,
              sessionNumber: sessionInfo.currentSession,
              isNewSession: false,
              courseName: '',
            },
            quotaInfo.reviewQuota
          );
        }

        const batches = createBatches(reviewQueue);
        const totalBatches = batches.length;

        dispatch({
          type: 'INITIALIZE',
          payload: {
            sessionInfo,
            quotaInfo,
            reviewQueue,
            batches,
            totalBatches,
            courseStats,
            initialReviewIndex: currentReviewIndex,
          },
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
      if (!user?.id || !state.sessionInfo) {
        logger.warn('[QuizSession] Cannot record - no session');
        return;
      }

      const isCorrect = responseType === 'correct';
      dispatch({
        type: 'ANSWER_QUESTION',
        payload: {
          questionId,
          answerIndex: selectedAnswer ?? -1,
          isCorrect,
          responseType,
        },
      });

      const { sessionInfo } = state;

      try {
        const result = await submitAnswer(
          {
            userId: user.id,
            courseId: sessionInfo.courseId,
            sessionNumber: sessionInfo.currentSession,
          },
          questionId,
          chunkId,
          responseType,
          timeSpentMs,
          selectedAnswer
        );

        dispatch({ type: 'SYNC_COMPLETE' });

        return {
          isTopicRefreshed: result.isTopicRefreshed,
          isChainBonusApplied: false,
        };
      } catch (err) {
        logger.error('[QuizSession] Error recording response:', err as Error);
        dispatch({ type: 'SYNC_COMPLETE' });
      }
    },
    [user?.id, state]
  );

  useEffect(() => {
    if (!state.sessionInfo || !user?.id || state.reviewQueue.length === 0) {
      return;
    }

    const storageKey = `${STORAGE_PREFIX}${user.id}_${state.sessionInfo.courseId}`;
    const queueKey = `${storageKey}_queue`;

    storage.set(storageKey, {
      sessionId: state.sessionInfo.currentSession,
      currentReviewIndex: state.currentReviewIndex,
    });
    storage.set(queueKey, state.reviewQueue);
  }, [
    state.reviewQueue,
    state.currentReviewIndex,
    state.sessionInfo,
    user?.id,
  ]);

  const getNextReviewItem = useCallback((): ReviewItem | null => {
    const { reviewQueue, currentReviewIndex } = state;
    if (currentReviewIndex >= reviewQueue.length) {
      return null;
    }
    return reviewQueue[currentReviewIndex];
  }, [state]);

  const markReviewComplete = useCallback(() => {
    dispatch({ type: 'NEXT_QUESTION' });
  }, []);

  const prevQuestion = useCallback(() => {
    dispatch({ type: 'PREV_QUESTION' });
  }, []);

  const advanceBatch = useCallback(() => {
    dispatch({ type: 'CONTINUE_BATCH' });
  }, []);

  const injectScaffolding = useCallback(
    (questionId: string, chunkId: string) => {
      dispatch({
        type: 'INJECT_SCAFFOLDING',
        payload: { questionId, chunkId, priority: 0 },
      });
    },
    []
  );

  return {
    state,
    initializeSession,
    recordResponse,
    getNextReviewItem,
    markReviewComplete,
    prevQuestion,
    advanceBatch,
    injectScaffolding,
  };
}
