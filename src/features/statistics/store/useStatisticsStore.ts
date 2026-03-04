import { create } from 'zustand';
import type { DailyEfficiencySummary } from '@/features/statistics/types/statisticsTypes';

// ==========================================
// === STATE TYPES ===
// ==========================================

export interface EfficiencyState {
  efficiencySummary: DailyEfficiencySummary | null;
}

export interface EfficiencyActions {
  setEfficiencySummary: (summary: DailyEfficiencySummary) => void;
  resetState: () => void;
}

export type EfficiencyStore = EfficiencyState & EfficiencyActions;

// ==========================================
// === INITIAL STATE ===
// ==========================================

const initialState: EfficiencyState = {
  efficiencySummary: null,
};

// ==========================================
// === STATE MANAGEMENT ===
// ==========================================

export const useStatisticsStore = create<EfficiencyStore>((set) => ({
  ...initialState,

  // ==========================================
  // === ACTIONS ===
  // ==========================================

  setEfficiencySummary: (summary: DailyEfficiencySummary) => {
    try {
      set({ efficiencySummary: summary });
    } catch (error) {
      console.error('[EfficiencyStore][setEfficiencySummary] Hata:', error);
    }
  },

  resetState: () => {
    set(initialState);
  },
}));

// ==========================================
// === SELECTORS ===
// ==========================================

export const selectEfficiencySummary = (state: EfficiencyStore) =>
  state.efficiencySummary;
