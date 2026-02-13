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

import { useState, useCallback, useMemo, type ReactNode } from 'react';
import {
  QuizSessionContext,
  type QuizSessionState,
  type QuizSessionContextValue,
} from './QuizSessionContext';
import { useAuth } from '../../../auth';
import {
  getSessionInfo,
  recordQuizProgress,
  getQuotaInfo,
  getContentVersion,
  getCourseStats,
} from '../../api/repository';
import { getReviewQueue } from '../../core/engine';
import { type ReviewItem, type QuizResponseType } from '../../core/types';
import { toast } from 'sonner';
import { logger } from '@/shared/lib/core/utils/logger';
import { storage } from '@/shared/lib/core/services/storage.service';

const STORAGE_PREFIX = 'auditpath_quiz_session_';

const initialState: QuizSessionState = {
  isInitialized: false,
  isLoading: false,
  error: null,
  sessionInfo: null,
  quotaInfo: null,
  reviewQueue: [],
  batches: [],
  currentBatchIndex: 0,
  totalBatches: 0,
  currentReviewIndex: 0,
  isReviewPhase: false,
  courseStats: null,
};

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
  const [state, setState] = useState<QuizSessionState>(initialState);

  // Initialize session for a course
  const initializeSession = useCallback(
    async (courseId: string) => {
      if (!user?.id) {
        setState((prev: QuizSessionState) => ({
          ...prev,
          error: 'Kullanıcı oturumu bulunamadı',
        }));
        return;
      }

      setState((prev: QuizSessionState) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

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
              courseName: '',
            },
            quotaInfo.reviewQuota
          );

          // Save initial state to storage if we have a queue
          if (reviewQueue.length > 0) {
            storage.set(
              storageKey,
              {
                sessionId: sessionInfo.currentSession,
                currentReviewIndex,
              },
              { ttl: 24 * 60 * 60 * 1000 }
            ); // 24 hours
            storage.set(queueKey, reviewQueue, { ttl: 24 * 60 * 60 * 1000 }); // 24 hours
          }
        }

        // Process batches
        const batches = createBatches(reviewQueue);
        const totalBatches = batches.length;

        // If restoring, figure out which batch we are in based on currentReviewIndex
        // But since we track global index, we can just derive active batch dynamically?
        // Actually, we need to track currentBatchIndex explicitly to show Intermission.
        // Let's recalculate currentBatchIndex based on global currentReviewIndex
        let calculatedBatchIndex = 0;
        let runningCount = 0;
        for (let i = 0; i < batches.length; i++) {
          if (currentReviewIndex < runningCount + batches[i].length) {
            calculatedBatchIndex = i;
            break;
          }
          runningCount += batches[i].length;
          // If we are at the end, it stays at last batch
          if (i === batches.length - 1) calculatedBatchIndex = i;
        }

        setState({
          isInitialized: true,
          isLoading: false,
          error: null,
          sessionInfo,
          quotaInfo,
          reviewQueue,
          batches,
          currentBatchIndex: calculatedBatchIndex,
          totalBatches,
          currentReviewIndex,
          isReviewPhase: reviewQueue.length > 0,
          courseStats,
        });
      } catch (err) {
        logger.error('[QuizSession] Initialization error:', err as Error);
        setState((prev: QuizSessionState) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Bilinmeyen hata',
        }));
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

      timeSpentMs: number,
      diagnosis?: string,
      insight?: string
    ) => {
      if (!user?.id || !state.sessionInfo) {
        logger.warn('[QuizSession] Cannot record - no session');
        return;
      }

      const { sessionInfo } = state;

      try {
        // Check if it's a review question (Backfill or Pending)
        const currentItem = state.reviewQueue.find(
          (q: ReviewItem) => q.questionId === questionId
        );
        const isReviewQuestion = currentItem
          ? currentItem.status !== 'active'
          : false;

        // Record response (updates progress, mastery, and handles shelf system)
        await recordQuizProgress({
          user_id: user.id,
          question_id: questionId,
          chunk_id: chunkId,
          course_id: sessionInfo.courseId,
          response_type: responseType,
          selected_answer: selectedAnswer,
          session_number: sessionInfo.currentSession,
          is_review_question: isReviewQuestion,
          time_spent_ms: timeSpentMs,
          ai_diagnosis: diagnosis,
          ai_insight: insight,
        });

        // Update local stats (Simplified)
        if (state.courseStats) {
          setState((prev: QuizSessionState) => ({
            ...prev,
            courseStats: prev.courseStats
              ? {
                  ...prev.courseStats,
                  totalQuestionsSolved:
                    prev.courseStats.totalQuestionsSolved + 1,
                }
              : null,
          }));
        }

        return;
      } catch (err) {
        logger.error('[QuizSession] Error recording response:', err as Error);
      }
    },
    [user?.id, state]
  );

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
    setState((prev: QuizSessionState) => {
      const nextIndex = prev.currentReviewIndex + 1;
      const isStillReviewing = nextIndex < prev.reviewQueue.length;

      // Update storage
      if (prev.sessionInfo && user?.id) {
        const storageKey = `${STORAGE_PREFIX}${user.id}_${prev.sessionInfo.courseId}`;
        const queueKey = `${storageKey}_queue`;
        if (isStillReviewing) {
          // Optimization: Only update the index/metadata, don't re-save the entire queue
          storage.set(
            storageKey,
            {
              sessionId: prev.sessionInfo.currentSession,
              currentReviewIndex: nextIndex,
            },
            { ttl: 24 * 60 * 60 * 1000 }
          ); // 24 hours
        } else {
          // Clear storage when session is done
          storage.remove(storageKey);
          storage.remove(queueKey);
        }
      }

      return {
        ...prev,
        currentReviewIndex: nextIndex,
        isReviewPhase: isStillReviewing,
      };
    });
  }, [user?.id]);

  // Advance to next batch
  const advanceBatch = useCallback(() => {
    setState((prev: QuizSessionState) => {
      if (prev.currentBatchIndex >= prev.totalBatches - 1) return prev;
      return {
        ...prev,
        currentBatchIndex: prev.currentBatchIndex + 1,
      };
    });
  }, []);

  // Inject scaffolding question (Immediate Priority)
  const injectScaffolding = useCallback(
    (questionId: string, chunkId: string) => {
      if (!state.sessionInfo) return;

      setState((prev: QuizSessionState) => {
        const newItem: ReviewItem = {
          questionId,
          chunkId,
          courseId: prev.sessionInfo!.courseId,
          priority: 0,
          status: 'pending_followup',
        };

        const newQueue = [...prev.reviewQueue];
        // Insert AFTER current index so it appears next in global queue
        // NOTE: This might shift indices for subsequent batches, but since we regenerate batches below, it's fine.
        newQueue.splice(prev.currentReviewIndex + 1, 0, newItem);

        // Update batches:
        // We need to insert into the CURRENT batch specifically to ensure it appears now.
        // Re-creating all batches from scratch might push it to the next batch if logic is strict.
        // So we manually insert into current batch array.
        const newBatches = [...prev.batches];
        if (newBatches[prev.currentBatchIndex]) {
          const currentBatch = [...newBatches[prev.currentBatchIndex]];
          // Find where we are in valid batch index.
          // Global currentReviewIndex is absolute.
          // We need relative index in batch.
          // But wait, QuizEngine uses the batch array directly.
          // If we just append to current batch, it's easiest.
          // But we want it "next".
          // We don't track "currentIndexInBatch" explicitly, we derive it.

          // Simpler approach: Re-generate batches from newQueue, but lock the split points?
          // No, dynamic is better.
          // Let's just insert into the current batch array at the correct relative position.

          // Calculate how many items were in previous batches
          let previousItemsCount = 0;
          for (let i = 0; i < prev.currentBatchIndex; i++) {
            previousItemsCount += prev.batches[i].length;
          }

          const relativeIndex = prev.currentReviewIndex - previousItemsCount;

          currentBatch.splice(relativeIndex + 1, 0, newItem);
          newBatches[prev.currentBatchIndex] = currentBatch;
        }

        // Update local storage to persist the injection
        if (state.sessionInfo && user?.id) {
          const storageKey = `${STORAGE_PREFIX}${user.id}_${state.sessionInfo.courseId}`;
          const queueKey = `${storageKey}_queue`;
          storage.set(
            storageKey,
            {
              sessionId: state.sessionInfo.currentSession,
              currentReviewIndex: prev.currentReviewIndex,
            },
            { ttl: 24 * 60 * 60 * 1000 }
          ); // 24 hours
          storage.set(queueKey, newQueue, { ttl: 24 * 60 * 60 * 1000 }); // 24 hours
        }

        return {
          ...prev,
          reviewQueue: newQueue,
          batches: newBatches,
          isReviewPhase: true,
        };
      });
    },
    [state.sessionInfo, user?.id]
  );

  const value: QuizSessionContextValue = useMemo(
    () => ({
      state,
      initializeSession,
      recordResponse,
      getNextReviewItem,
      markReviewComplete,
      advanceBatch,
      injectScaffolding,
    }),
    [
      state,
      initializeSession,
      recordResponse,
      getNextReviewItem,
      markReviewComplete,
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
