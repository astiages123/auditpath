import { createBaseStore } from '@/shared/store/baseStore';
import { DailyEfficiencySummary } from '@/features/efficiency/types/efficiencyTypes';

interface EfficiencyStore {
  efficiencySummary: DailyEfficiencySummary | null;
  setEfficiencySummary: (summary: DailyEfficiencySummary) => void;
}

export const useEfficiencyStore = createBaseStore<EfficiencyStore>((set) => ({
  efficiencySummary: null,
  setEfficiencySummary: (summary) => set({ efficiencySummary: summary }),
}));
