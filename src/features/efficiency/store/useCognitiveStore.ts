import { create } from 'zustand';
import { getBloomStats } from '@/features/quiz/services/quizAnalyticsService';
import {
  getRecentCognitiveInsights,
  getRecentQuizSessions,
} from '@/features/quiz/services/quizHistoryService';
import { getRecentActivitySessions } from '@/features/pomodoro/services/pomodoroService';
import {
  BloomStats,
  CognitiveInsight,
  RecentQuizSession,
} from '@/features/quiz/types';
import { RecentSession } from '@/features/pomodoro/types/pomodoroTypes';
import { logger } from '@/utils/logger';

interface CognitiveState {
  userId: string | null;
  bloomStats: BloomStats[] | null;
  recentSessions: RecentSession[] | null;
  recentQuizzes: RecentQuizSession[] | null;
  cognitiveInsights: CognitiveInsight[] | null;
  error: Error | null;

  isFetchingBloom: boolean;
  isFetchingSessions: boolean;
  isFetchingQuizzes: boolean;
  isFetchingCognitive: boolean;

  fetchData: (userId: string) => void;
}

export const useCognitiveStore = create<CognitiveState>((set, get) => ({
  userId: null,
  bloomStats: null,
  recentSessions: null,
  recentQuizzes: null,
  cognitiveInsights: null,
  error: null,

  isFetchingBloom: false,
  isFetchingSessions: false,
  isFetchingQuizzes: false,
  isFetchingCognitive: false,

  fetchData: (newUserId: string) => {
    const state = get();
    // Use cached data if same user and already fetched/fetching
    if (
      state.userId === newUserId &&
      (state.isFetchingBloom || state.bloomStats !== null)
    ) {
      return;
    }

    set({
      userId: newUserId,
      error: null,
      isFetchingBloom: true,
      isFetchingSessions: true,
      isFetchingQuizzes: true,
      isFetchingCognitive: true,
    });

    // Fire all requests concurrently, updating state individually as they resolve
    getBloomStats(newUserId)
      .then((data) => set({ bloomStats: data || [], isFetchingBloom: false }))
      .catch((e) => {
        logger.error('Error fetching bloom', e as Error);
        set({ error: e as Error, isFetchingBloom: false });
      });

    getRecentActivitySessions(newUserId, 20)
      .then((data) =>
        set({ recentSessions: data || [], isFetchingSessions: false })
      )
      .catch((e) => {
        logger.error('Error fetching recent', e as Error);
        set({ error: e as Error, isFetchingSessions: false });
      });

    getRecentQuizSessions(newUserId, 50)
      .then((data) =>
        set({ recentQuizzes: data || [], isFetchingQuizzes: false })
      )
      .catch((e) => {
        logger.error('Error fetching quizzes', e as Error);
        set({ error: e as Error, isFetchingQuizzes: false });
      });

    getRecentCognitiveInsights(newUserId, 30)
      .then((data) =>
        set({
          cognitiveInsights: data || [],
          isFetchingCognitive: false,
        })
      )
      .catch((e) => {
        logger.error('Error fetching cognitive', e as Error);
        set({ error: e as Error, isFetchingCognitive: false });
      });
  },
}));
