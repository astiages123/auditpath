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
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  QuizSessionContext,
  type QuizSessionState,
  type QuizSessionContextValue,
} from './QuizSessionContext';
import { useAuth } from '@/features/auth';
import {
  getSessionInfo,
  recordQuizResponse,
  getQuotaInfo,
  getReviewQueue,
  getContentVersion,
  getCourseStats,
  type ReviewItem,
  type QuizResponseType,
} from '@/features/quiz/tasks/manage-mastery';
import { toast } from 'sonner';

const STORAGE_PREFIX = 'auditpath_quiz_session_';


const initialState: QuizSessionState = {
  isInitialized: false,
  isLoading: false,
  error: null,
  sessionInfo: null,
  quotaInfo: null,
  reviewQueue: [],
  currentReviewIndex: 0,
  isReviewPhase: false,
  courseStats: null,
};


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
        setState((prev) => ({
          ...prev,
          error: 'Kullanıcı oturumu bulunamadı',
        }));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Get session info (increments counter if new day)
        const sessionInfo = await getSessionInfo(user.id, courseId);
        if (!sessionInfo) {
          throw new Error('Seans bilgisi alınamadı');
        }

        // Get quota info
        const quotaInfo = await getQuotaInfo(
          user.id,
          courseId,
          sessionInfo.currentSession
        );

        // Initialize stats
        const courseStats = await getCourseStats(user.id, courseId);

        // --- Version Guard ---
        const contentVersion = await getContentVersion(courseId);
        const versionKey = `${STORAGE_PREFIX}${user.id}_${courseId}_version`;
        
        if (contentVersion) {
            const storedVersion = localStorage.getItem(versionKey);
            if (storedVersion && storedVersion !== contentVersion) {
                toast.warning('İçerik güncellendi, taze veriler için oturumu yenilemeniz önerilir', {
                    duration: 8000,
                    action: {
                        label: 'Yenile',
                        onClick: () => window.location.reload(),
                    },
                });
            }
            // Always update to latest
            localStorage.setItem(versionKey, contentVersion);
        }

        // Check for saved session in localStorage
        const storageKey = `${STORAGE_PREFIX}${user.id}_${courseId}`;
        const savedSessionStr = localStorage.getItem(storageKey);
        let restoredQueue = false;
        let currentReviewIndex = 0;
        let reviewQueue: ReviewItem[] = [];

        if (savedSessionStr) {
          try {
            const savedSession = JSON.parse(savedSessionStr);
            // Only restore if it matches the current session ID we just got from DB
            if (savedSession.sessionId === sessionInfo.currentSession) {
              reviewQueue = savedSession.reviewQueue || [];
              currentReviewIndex = savedSession.currentReviewIndex || 0;
              restoredQueue = true;
              // console.log('[QuizSession] Restored session from storage');
            } else {
               localStorage.removeItem(storageKey);
            }
          } catch (e) {
            console.error('[QuizSession] Error parsing saved session', e);
            localStorage.removeItem(storageKey);
          }
        }

        if (!restoredQueue) {
          // Always fetch queue in Waterfall model (it handles Pending + Active + Archived)
          reviewQueue = await getReviewQueue(
            user.id,
            courseId,
            sessionInfo.currentSession,
            quotaInfo.reviewQuota
          );
          
          // Save initial state to storage if we have a queue
          if (reviewQueue.length > 0) {
             localStorage.setItem(storageKey, JSON.stringify({
               sessionId: sessionInfo.currentSession,
               reviewQueue,
               currentReviewIndex
             }));
          }
        }

        setState({
          isInitialized: true,
          isLoading: false,
          error: null,
          sessionInfo,
          quotaInfo,
          reviewQueue,
          currentReviewIndex,
          isReviewPhase: reviewQueue.length > 0,
          courseStats,
        });

        /*
        console.log(
          `[QuizSession] Initialized: Session #${sessionInfo.currentSession}, ` +
            `${quotaInfo.pendingReviewCount} pending reviews, ` +
            `Mode: ${quotaInfo.isMaintenanceMode ? 'Maintenance (70/30)' : 'Normal (80/20)'}`
        );
        */
      } catch (err) {
        console.error('[QuizSession] Initialization error:', err);
        setState((prev) => ({
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
        console.warn('[QuizSession] Cannot record - no session');
        return;
      }

      const { sessionInfo } = state;

      try {
        // Check if it's a review question (Backfill or Pending)
        const currentItem = state.reviewQueue.find(q => q.questionId === questionId);
        const isReviewQuestion = currentItem ? currentItem.status !== 'active' : false;

        // Record response (updates progress, mastery, and handles shelf system)
        const result = await recordQuizResponse(
          user.id,
          questionId,
          chunkId,
          sessionInfo.courseId,
          responseType,
          selectedAnswer,
          sessionInfo.currentSession,

          isReviewQuestion, // Use specific item status
          timeSpentMs,
          diagnosis,
          insight
        );

        // Update local stats (Simplified)
        if (state.courseStats) {
             setState(prev => ({
                ...prev,
                courseStats: prev.courseStats ? {
                    ...prev.courseStats,
                    totalQuestionsSolved: prev.courseStats.totalQuestionsSolved + 1,
                } : null
             }));
        }

        return result;

      } catch (err) {
        console.error('[QuizSession] Error recording response:', err);
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
    setState((prev) => {
      const nextIndex = prev.currentReviewIndex + 1;
      const isStillReviewing = nextIndex < prev.reviewQueue.length;

      // Update storage
      if (prev.sessionInfo && user?.id) {
        const storageKey = `${STORAGE_PREFIX}${user.id}_${prev.sessionInfo.courseId}`;
        if (isStillReviewing) {
            localStorage.setItem(storageKey, JSON.stringify({
                sessionId: prev.sessionInfo.currentSession,
                reviewQueue: prev.reviewQueue,
                currentReviewIndex: nextIndex
            }));
        } else {
            // Clear storage when session is done
            localStorage.removeItem(storageKey);
        }
      }

      return {
        ...prev,
        currentReviewIndex: nextIndex,
        isReviewPhase: isStillReviewing,
      };
    });
  }, [user?.id]);

  // Inject scaffolding question (Immediate Priority)
  const injectScaffolding = useCallback((questionId: string, chunkId: string) => {
    if (!state.sessionInfo) return;

    setState((prev) => {
        const newItem: ReviewItem = {
            questionId,
            chunkId,
            courseId: prev.sessionInfo!.courseId,
            priority: 0,
            status: 'pending_followup'
        };

        const newQueue = [...prev.reviewQueue];
        // Insert AFTER current index so it appears next
        newQueue.splice(prev.currentReviewIndex + 1, 0, newItem);

        // Update local storage to persist the injection
        if (state.sessionInfo && user?.id) {
            const storageKey = `${STORAGE_PREFIX}${user.id}_${state.sessionInfo.courseId}`;
            localStorage.setItem(storageKey, JSON.stringify({
                sessionId: state.sessionInfo.currentSession,
                reviewQueue: newQueue,
                currentReviewIndex: prev.currentReviewIndex // Index hasn't changed yet
            }));
        }

        return {
            ...prev,
            reviewQueue: newQueue,
            isReviewPhase: true
        };
    });
  }, [state.sessionInfo, user?.id]);

  const value: QuizSessionContextValue = {
    state,
    initializeSession,
    recordResponse,
    getNextReviewItem,
    markReviewComplete,
    injectScaffolding,
  };

  return (
    <QuizSessionContext.Provider value={value}>
      {children}
    </QuizSessionContext.Provider>
  );
}

