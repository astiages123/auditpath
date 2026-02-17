/**
 * Quiz Session Provider
 *
 * React Context provider for managing SRS session state during quiz flow.
 * Handles:
 * - Session initialization and counter management
 * - Review queue fetching
 * - Quota calculation (80/20 or 70/30)
 * - Response recording to database
 */

import {
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import {
  QuizSessionContext,
  type QuizSessionContextValue,
} from './quizSessionContext';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getSessionInfo,
  getQuotaInfo,
  getContentVersion,
  getCourseStats,
} from '@/features/quiz/services/repositories/quizRepository';
import { getReviewQueue } from '@/features/quiz/logic/engines/queueEngine';
import { submitAnswer } from '@/features/quiz/logic/engines/submissionEngine';
import {
  type ReviewItem,
  type QuizResponseType,
} from '@/features/quiz/types/quizTypes';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { storage } from '@/shared/services/storageService';
import {
  initialQuizSessionState,
  quizSessionReducer,
} from './quizSessionReducer';

const STORAGE_PREFIX = 'auditpath_quiz_session_';

// Helper: Split queue into batches of 10 (Focused Learning Flow)
function createBatches(queue: ReviewItem[]): ReviewItem[][] {
  const BATCH_SIZE = 10;
  const batches: ReviewItem[][] = [];

  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    batches.push(queue.slice(i, i + BATCH_SIZE));
  }

  return batches.length > 0 ? batches : [[]];
}

// --- Provider ---
interface QuizSessionProviderProps {
  children: ReactNode;
}

export function QuizSessionProvider({ children }: QuizSessionProviderProps) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(
    quizSessionReducer,
    initialQuizSessionState
  );

  // Initialize session for a course
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
        // Parallelized fetching of independent session components
        const [sessionInfo, quotaInfo, courseStats, contentVersion] =
          await Promise.all([
            getSessionInfo(user.id, courseId),
            getQuotaInfo(user.id, courseId, 0), // Session number initially unknown or independent
            getCourseStats(user.id, courseId),
            getContentVersion(courseId),
          ]);

        if (!sessionInfo) {
          throw new Error('Seans bilgisi alınamadı');
        }

        // --- Version Guard ---
        const versionKey = `${STORAGE_PREFIX}${user.id}_${courseId}_version`;

        if (contentVersion) {
          const storedVersion = storage.get<string>(versionKey);
          if (storedVersion && storedVersion !== contentVersion) {
            toast.warning(
              'İçerik güncellendi, taze veriler için oturumu yenilemeniz önerilir',
              {
                duration: 8000,
                action: {
                  label: 'Yenile',
                  onClick: () => window.location.reload(),
                },
              }
            );
          }
          // Always update to latest
          storage.set(versionKey, contentVersion, {
            ttl: 7 * 24 * 60 * 60 * 1000,
          }); // 7 days
        }

        // Check for saved session in localStorage
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
            // Only restore if it matches the current session ID we just got from DB
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
          // Always fetch queue in Waterfall model (it handles Pending + Active + Archived)
          reviewQueue = await getReviewQueue(
            {
              userId: user.id,
              courseId: courseId,
              sessionNumber: sessionInfo.currentSession,
              isNewSession: false,
              courseName: '', // Fetched inside orchestrator usually, or passed
            },
            quotaInfo.reviewQuota
          );
        }

        // Process batches
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
            initialReviewIndex: currentReviewIndex, // Pass restored index
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

  // Record a quiz response
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

      // 1. Optimistic Update
      const isCorrect = responseType === 'correct';
      // Assume answer index matches selectedAnswer logic
      // Note: QuizCard passes selectedAnswer index (0-3).
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
        // 2. Async logic & Persistence
        // We use submitAnswer from engine which handles logic + DB
        const result = await submitAnswer(
          {
            userId: user.id,
            courseId: sessionInfo.courseId,
            sessionNumber: sessionInfo.currentSession,
            isNewSession: false, // irrelevant here
          },
          questionId,
          chunkId,
          responseType,
          timeSpentMs,
          selectedAnswer
        );

        // 3. Sync Complete
        // We could update mastery again with real value if needed, but optimistic was +1.
        // Real value calculation is complex.

        dispatch({ type: 'SYNC_COMPLETE' });

        return {
          isTopicRefreshed: result.isTopicRefreshed,
          isChainBonusApplied: false,
        };
      } catch (err) {
        logger.error('[QuizSession] Error recording response:', err as Error);
        // Maybe dispatch SYNC_ERROR?
        // Dispatching SET_ERROR might lock the UI.
        // Ideally we just log and maybe retry via offline queue (which submitAnswer does).
        // So we can just clear syncing state.
        dispatch({ type: 'SYNC_COMPLETE' });
      }
    },
    [user?.id, state]
  );

  // Auto-save effect
  useEffect(() => {
    if (!state.sessionInfo || !user?.id || state.reviewQueue.length === 0)
      return;

    const storageKey = `${STORAGE_PREFIX}${user.id}_${state.sessionInfo.courseId}`;
    const queueKey = `${storageKey}_queue`;

    storage.set(
      storageKey,
      {
        sessionId: state.sessionInfo.currentSession,
        currentReviewIndex: state.currentReviewIndex,
      },
      { ttl: 24 * 60 * 60 * 1000 }
    );
    storage.set(queueKey, state.reviewQueue, { ttl: 24 * 60 * 60 * 1000 });
  }, [
    state.reviewQueue,
    state.currentReviewIndex,
    state.sessionInfo,
    user?.id,
  ]);

  // Get next review item
  const getNextReviewItem = useCallback((): ReviewItem | null => {
    const { reviewQueue, currentReviewIndex } = state;
    if (currentReviewIndex >= reviewQueue.length) {
      return null;
    }
    return reviewQueue[currentReviewIndex];
  }, [state]);

  // Mark current review as complete and move to next
  const markReviewComplete = useCallback(() => {
    dispatch({ type: 'NEXT_QUESTION' });
  }, []);

  // Go to previous question
  const prevQuestion = useCallback(() => {
    dispatch({ type: 'PREV_QUESTION' });
  }, []);

  // Advance to next batch (handle Intermission -> Playing)
  const advanceBatch = useCallback(() => {
    dispatch({ type: 'CONTINUE_BATCH' });
  }, []);

  // Inject scaffolding question (Immediate Priority)
  const injectScaffolding = useCallback(
    (questionId: string, chunkId: string) => {
      dispatch({
        type: 'INJECT_SCAFFOLDING',
        payload: { questionId, chunkId, priority: 0 },
      });
    },
    []
  );

  const value: QuizSessionContextValue = useMemo(
    () => ({
      state,
      initializeSession,
      recordResponse,
      getNextReviewItem,
      markReviewComplete,
      prevQuestion,
      advanceBatch,
      injectScaffolding,
    }),
    [
      state,
      initializeSession,
      recordResponse,
      getNextReviewItem,
      markReviewComplete,
      prevQuestion,
      advanceBatch,
      injectScaffolding,
    ]
  );

  return (
    <QuizSessionContext.Provider value={value}>
      {children}
    </QuizSessionContext.Provider>
  );
}
