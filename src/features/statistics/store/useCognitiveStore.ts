import { create } from 'zustand';
import {
  getRecentCognitiveInsights,
  getRecentQuizSessions,
} from '@/features/quiz/services/quizHistoryService';
import { getRecentActivitySessions } from '@/features/pomodoro/services/pomodoroService';

import type {
  BloomStats,
  CognitiveInsight,
  RecentQuizSession,
} from '@/features/quiz/types';
import type { RecentSession } from '@/features/pomodoro/types/pomodoroTypes';

// ==========================================
// === STATE TYPES ===
// ==========================================

export interface CognitiveState {
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
}

export interface CognitiveActions {
  fetchData: (userId: string) => void;
  resetState: () => void;
}

export type CognitiveStore = CognitiveState & CognitiveActions;

// ==========================================
// === INITIAL STATE ===
// ==========================================

const initialState: CognitiveState = {
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
};

// ==========================================
// === STATE MANAGEMENT ===
// ==========================================

export const useCognitiveStore = create<CognitiveStore>((set, get) => ({
  ...initialState,

  // ==========================================
  // === ACTIONS ===
  // ==========================================

  fetchData: (newUserId: string) => {
    try {
      const state = get();

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

      // Temporarily bypass bloom stats since getBloomStats is unavailable
      set({ bloomStats: [], isFetchingBloom: false });

      getRecentActivitySessions(newUserId, 20)
        .then((data: RecentSession[] | null) =>
          set({ recentSessions: data || [], isFetchingSessions: false })
        )
        .catch((e: Error | unknown) => {
          console.error(
            '[CognitiveStore][fetchData] getRecentActivitySessions Hata:',
            e
          );
          set({ error: e as Error, isFetchingSessions: false });
        });

      getRecentQuizSessions(newUserId, 50)
        .then((data: RecentQuizSession[] | null) =>
          set({ recentQuizzes: data || [], isFetchingQuizzes: false })
        )
        .catch((e: Error | unknown) => {
          console.error(
            '[CognitiveStore][fetchData] getRecentQuizSessions Hata:',
            e
          );
          set({ error: e as Error, isFetchingQuizzes: false });
        });

      getRecentCognitiveInsights(newUserId, 30)
        .then((data: CognitiveInsight[] | null) =>
          set({
            cognitiveInsights: data || [],
            isFetchingCognitive: false,
          })
        )
        .catch((e: Error | unknown) => {
          console.error(
            '[CognitiveStore][fetchData] getRecentCognitiveInsights Hata:',
            e
          );
          set({ error: e as Error, isFetchingCognitive: false });
        });
    } catch (error) {
      console.error('[CognitiveStore][fetchData] Genel Hata:', error);
      set({ error: error as Error });
    }
  },

  resetState: () => {
    set(initialState);
  },
}));

// ==========================================
// === SELECTORS ===
// ==========================================

export const selectCognitiveState = (state: CognitiveStore) => state;
export const selectBloomStats = (state: CognitiveStore) => state.bloomStats;
export const selectCognitiveLoading = (state: CognitiveStore) =>
  state.isFetchingBloom ||
  state.isFetchingSessions ||
  state.isFetchingQuizzes ||
  state.isFetchingCognitive;
