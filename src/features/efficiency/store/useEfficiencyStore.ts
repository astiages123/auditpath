import { create } from "zustand";
import { DailyEfficiencySummary } from "@/features/efficiency/types/efficiencyTypes";

export interface EfficiencyStore {
  efficiencySummary: DailyEfficiencySummary | null;

  actions: {
    setEfficiencySummary: (summary: DailyEfficiencySummary) => void;
  };
}

export const useEfficiencyStore = create<EfficiencyStore>()((set) => ({
  efficiencySummary: null,

  actions: {
    setEfficiencySummary: (summary) => set({ efficiencySummary: summary }),
  },
}));
