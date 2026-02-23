import { useCallback, useState } from 'react';
import { generateForChunk } from '@/features/quiz/logic/quizParser';
import { GenerationLog } from '@/features/quiz/types';
import { logger } from '@/utils/logger';
import { MAX_LOG_ENTRIES } from '../utils/constants';

export interface GenerationState {
  isGenerating: boolean;
  logs: GenerationLog[];
  progress: { current: number; total: number };
}

const INITIAL_GENERATION_STATE: GenerationState = {
  isGenerating: false,
  logs: [],
  progress: { current: 0, total: 0 },
};

export function useQuizGeneration() {
  const [generation, setGeneration] = useState<GenerationState>(
    INITIAL_GENERATION_STATE
  );

  const createGenerationCallbacks = useCallback(
    (onCompleteExtra?: () => void | Promise<void>) => ({
      onLog: (log: GenerationLog) =>
        setGeneration((prev) => ({
          ...prev,
          logs: [log, ...prev.logs].slice(0, MAX_LOG_ENTRIES),
        })),
      onTotalTargetCalculated: (total: number) =>
        setGeneration((prev) => ({
          ...prev,
          progress: { ...prev.progress, total },
        })),
      onQuestionSaved: (count: number) =>
        setGeneration((prev) => ({
          ...prev,
          progress: { ...prev.progress, current: count },
        })),
      onComplete: async () => {
        if (onCompleteExtra) await onCompleteExtra();
        setGeneration((prev) => ({ ...prev, isGenerating: false }));
      },
      onError: (err: string) => {
        logger.error('Generation error:', { message: err });
        setGeneration((prev) => ({ ...prev, isGenerating: false }));
      },
    }),
    []
  );

  const startGeneration = useCallback(
    async (
      targetChunkId: string,
      onComplete?: () => void | Promise<void>,
      userId?: string
    ) => {
      if (!targetChunkId) return;

      const initialLogs: GenerationLog[] = [
        {
          id: 'ai-warning-' + Date.now(),
          message: 'İçerik analiz ediliyor...',
          step: 'INIT',
          details: {},
          timestamp: new Date(),
        },
      ];

      setGeneration({
        isGenerating: true,
        logs: initialLogs,
        progress: { current: 0, total: 0 },
      });

      try {
        await generateForChunk(
          targetChunkId,
          createGenerationCallbacks(onComplete),
          { userId }
        );
      } catch (error) {
        logger.error('Failed to generate:', error as Error);
        setGeneration((prev) => ({ ...prev, isGenerating: false }));
      }
    },
    [createGenerationCallbacks]
  );

  const resetGeneration = useCallback(() => {
    setGeneration(INITIAL_GENERATION_STATE);
  }, []);

  return {
    generation,
    startGeneration,
    resetGeneration,
    createGenerationCallbacks,
  };
}
