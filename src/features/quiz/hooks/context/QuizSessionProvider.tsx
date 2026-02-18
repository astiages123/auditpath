import {
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';

import {
  QuizAction,
  QuizSessionState,
  ReviewItem,
  QuizResponseType,
} from '@/features/quiz/types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getSessionInfo,
  getQuotaInfo,
  getContentVersion,
  getCourseStats,
} from '@/features/quiz/services/repositories/quizRepository';
import { getReviewQueue } from '@/features/quiz/logic/engines/queueEngine';
import { submitAnswer } from '@/features/quiz/logic/engines/submissionEngine';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { storage } from '@/shared/services/storageService';
import {
  QuizSessionContext,
  type QuizSessionContextValue,
} from './QuizSessionContext';

// Content from quizSessionReducer.ts
const initialQuizSessionState: QuizSessionState = {
  // Removed export
  status: 'IDLE',
  sessionInfo: null,
  quotaInfo: null,
  reviewQueue: [],
  batches: [],
  currentBatchIndex: 0,
  totalBatches: 0,
  currentReviewIndex: 0, // Global index in reviewQueue
  courseStats: null,
  error: null,
  isSyncing: false,
  // SSoT fields moved from QuizEngine
  currentQuestion: null,
  results: {
    correct: 0,
    incorrect: 0,
    blank: 0,
    totalTimeMs: 0,
  },
  isAnswered: false,
  selectedAnswer: null,
  isCorrect: null,
  startTime: null,
};

function quizSessionReducer( // Removed export
  state: QuizSessionState,
  action: QuizAction
): QuizSessionState {
  switch (action.type) {
    case 'INITIALIZE': {
      const {
        sessionInfo,
        quotaInfo,
        reviewQueue,
        batches,
        totalBatches,
        courseStats,
      } = action.payload;

      const currentReviewIndex = action.payload.initialReviewIndex || 0;

      // Calculate derived batch index if restoring
      let currentBatchIndex = 0;
      if (currentReviewIndex > 0) {
        let runningCount = 0;
        for (let i = 0; i < batches.length; i++) {
          if (currentReviewIndex < runningCount + batches[i].length) {
            currentBatchIndex = i;
            break;
          }
          runningCount += batches[i].length;
        }
      }

      return {
        ...state,
        status: 'READY',
        sessionInfo,
        quotaInfo,
        reviewQueue,
        batches,
        totalBatches,
        courseStats,
        currentBatchIndex,
        currentReviewIndex,
        error: null,
        isSyncing: false,
      };
    }

    case 'SET_ERROR':
      return {
        ...state,
        status: 'ERROR',
        error: action.payload,
        isSyncing: false,
      };

    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload,
      };

    case 'START_PLAYING':
      return {
        ...state,
        status: 'PLAYING',
      };

    case 'ANSWER_QUESTION': {
      const { isCorrect, responseType } = action.payload;
      // Optimistic Course Stats Update
      const newCourseStats = state.courseStats
        ? {
            ...state.courseStats,
            totalQuestionsSolved: state.courseStats.totalQuestionsSolved + 1,
            // Note: Average Mastery update is complex to do optimistically perfectly,
            // but we can approximate or wait for sync.
            // For now just increment count.
          }
        : null;

      return {
        ...state,
        isAnswered: true,
        selectedAnswer: action.payload.answerIndex,
        isCorrect: isCorrect,
        results: {
          ...state.results,
          correct: state.results.correct + (responseType === 'correct' ? 1 : 0),
          incorrect:
            state.results.incorrect + (responseType === 'incorrect' ? 1 : 0),
          blank: state.results.blank + (responseType === 'blank' ? 1 : 0),
        },
        courseStats: newCourseStats,
        isSyncing: true, // Optimistically handled, but technically syncing to DB
      };
    }

    case 'SYNC_START':
      return {
        ...state,
        isSyncing: true,
      };

    case 'SYNC_COMPLETE':
      return {
        ...state,
        isSyncing: false,
      };

    case 'NEXT_QUESTION': {
      // 1. Calculate next index
      const nextIndex = state.currentReviewIndex + 1;

      // 2. Check if finished
      if (nextIndex >= state.reviewQueue.length) {
        return {
          ...state,
          status: 'FINISHED',
          isAnswered: false,
          selectedAnswer: null,
          isCorrect: null,
        };
      }

      // 3. Check for Batch Transition
      // We need to know if we crossed a batch boundary
      // Batches are just logical groupings. State has `batches` array.
      // We can check if nextIndex corresponds to the start of the next batch?
      // Or simply: Calculate which batch the *next* question belongs to.

      // Let's iterate batches to find where nextIndex falls
      let cumulativeCount = 0;
      let nextBatchIndex = 0;
      for (let i = 0; i < state.batches.length; i++) {
        const batchLen = state.batches[i].length;
        if (nextIndex < cumulativeCount + batchLen) {
          nextBatchIndex = i;
          break;
        }
        cumulativeCount += batchLen;
      }

      // If next question is in a DIFFERENT batch than current, trigger INTERMISSION
      if (nextBatchIndex > state.currentBatchIndex) {
        return {
          ...state,
          status: 'INTERMISSION',
          currentBatchIndex: nextBatchIndex, // Advance logically, but UI shows Intermission
          // Don't advance currentReviewIndex yet?
          // Usually Intermission is shown *before* showing the next batch's first question.
          // So we pause here.
          isAnswered: false,
          selectedAnswer: null,
          isCorrect: null,
          // Keep currentReviewIndex as is? Or advance it?
          // If we advance, `QuizEngine` might try to render the question.
          // We want `status` to block the view.
          currentReviewIndex: nextIndex,
        };
      }

      return {
        ...state,
        currentReviewIndex: nextIndex,
        isAnswered: false,
        selectedAnswer: null,
        isCorrect: null,
        status: 'PLAYING', // Ensure we are playing
      };
    }

    case 'FINISH_BATCH':
      // Explicit action to trigger intermission if needed manually
      return {
        ...state,
        status: 'INTERMISSION',
      };

    case 'CONTINUE_BATCH':
      return {
        ...state,
        status: 'PLAYING',
      };

    case 'INJECT_SCAFFOLDING': {
      const { questionId, chunkId, priority } = action.payload;

      // Immutable Injection
      const newItem: ReviewItem = {
        questionId,
        chunkId,
        courseId: state.sessionInfo?.courseId || '',
        status: 'pending_followup',
        priority,
      };

      // 1. Insert into Review Queue (Global)
      // Insert AFTER current index
      const insertIndex = state.currentReviewIndex + 1;
      const newReviewQueue = [
        ...state.reviewQueue.slice(0, insertIndex),
        newItem,
        ...state.reviewQueue.slice(insertIndex),
      ];

      // 2. Insert into Batches (Complex)
      // We want it to appear *immediately* in the CURRENT batch if possible,
      // or lengthen the current batch.

      const newBatches = [...state.batches];
      if (newBatches[state.currentBatchIndex]) {
        // Needed: Insert at correct relative position in current batch.
        // Simplified: Just push to current batch?
        // If we are at index X in batch, we want X+1 to be this new item.
        // But we don't track in-batch index explicitly in state, only global `currentReviewIndex`.

        // Re-calculate relative index
        let prevCount = 0;
        for (let i = 0; i < state.currentBatchIndex; i++) {
          prevCount += state.batches[i].length;
        }
        const relativeIndex = state.currentReviewIndex - prevCount;

        const currentBatch = [...newBatches[state.currentBatchIndex]];
        // Insert after current
        currentBatch.splice(relativeIndex + 1, 0, newItem);

        newBatches[state.currentBatchIndex] = currentBatch;
      }

      return {
        ...state,
        reviewQueue: newReviewQueue,
        batches: newBatches,
        // No index change needed, it will be picked up as next
      };
    }

    case 'FINISH_QUIZ':
      return {
        ...state,
        status: 'FINISHED',
      };

    case 'PREV_QUESTION': {
      const prevIndex = Math.max(0, state.currentReviewIndex - 1);
      return {
        ...state,
        currentReviewIndex: prevIndex,
        isAnswered: false,
        selectedAnswer: null,
        isCorrect: null,
        status: 'PLAYING',
      };
    }

    default:
      return state;
  }
}

// Content from quizSessionProvider.tsx
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
