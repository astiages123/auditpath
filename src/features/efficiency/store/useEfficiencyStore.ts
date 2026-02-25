import { create } from 'zustand';
import { DailyEfficiencySummary } from '@/features/efficiency/types/efficiencyTypes';

interface EfficiencyStore {
  efficiencySummary: DailyEfficiencySummary | null;
  setEfficiencySummary: (summary: DailyEfficiencySummary) => void;
}

export const useEfficiencyStore = create<EfficiencyStore>((set) => ({
  efficiencySummary: null,
  setEfficiencySummary: (summary) => set({ efficiencySummary: summary }),
}));
