import { useCallback, useState } from "react";
import { type GenerationLog } from "@/features/quiz/types/quizEngineSchemas";
import { MAX_LOG_ENTRIES } from "@/utils/constants";

export interface GenerationState {
  isGenerating: boolean;
  logs: GenerationLog[];
  progress: { current: number; total: number };
}

export const INITIAL_GENERATION_STATE: GenerationState = {
  isGenerating: false,
  logs: [],
  progress: { current: 0, total: 0 },
};

export function useQuizGeneration() {
  const [generation, setGeneration] = useState<GenerationState>(
    INITIAL_GENERATION_STATE,
  );

  const updateGeneration = useCallback((patch: Partial<GenerationState>) => {
    setGeneration((prev) => ({ ...prev, ...patch }));
  }, []);

  const addLog = useCallback((log: GenerationLog) => {
    setGeneration((prev) => ({
      ...prev,
      logs: [log, ...prev.logs].slice(0, MAX_LOG_ENTRIES),
    }));
  }, []);

  const startGeneration = useCallback(
    (initialLogs: GenerationLog[] = []) => {
      updateGeneration({
        isGenerating: true,
        logs: initialLogs,
        progress: { current: 0, total: 0 },
      });
    },
    [updateGeneration],
  );

  const stopGeneration = useCallback(() => {
    updateGeneration({ isGenerating: false });
  }, [updateGeneration]);

  return {
    generation,
    setGeneration,
    updateGeneration,
    addLog,
    startGeneration,
    stopGeneration,
  };
}
