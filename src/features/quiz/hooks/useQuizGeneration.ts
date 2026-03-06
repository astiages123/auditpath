import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateForChunk } from '@/features/quiz/logic/quizParser';
import { GenerationLog, type GenerationStep } from '@/features/quiz/types';
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const createGenerationCallbacks = useCallback(
    (onCompleteExtra?: () => void | Promise<void>) => ({
      onLog: (log: GenerationLog) =>
        setGeneration((previousState) => ({
          ...previousState,
          logs: [log, ...previousState.logs].slice(0, MAX_LOG_ENTRIES),
        })),
      onTotalTargetCalculated: (total: number) =>
        setGeneration((previousState) => ({
          ...previousState,
          progress: { ...previousState.progress, total },
        })),
      onQuestionSaved: (count: number) =>
        setGeneration((previousState) => ({
          ...previousState,
          progress: { ...previousState.progress, current: count },
        })),
      onComplete: async () => {
        if (onCompleteExtra) {
          try {
            await onCompleteExtra();
          } catch (caughtError) {
            logger.error(
              'QuizGeneration',
              'createGenerationCallbacks',
              'Tamamlama callback hatası:',
              caughtError as Error
            );
          }
        }

        setGeneration((previousState) => ({
          ...previousState,
          isGenerating: false,
        }));
        abortControllerRef.current = null;
      },
      onError: (errorMessage: string) => {
        const isAbort = errorMessage.includes(
          'kullanıcı tarafından durduruldu'
        );
        if (!isAbort) {
          logger.error(
            'QuizGeneration',
            'createGenerationCallbacks',
            'Üretim hatası:',
            { message: errorMessage }
          );
        }
        setGeneration((previousState) => ({
          ...previousState,
          isGenerating: false,
        }));
        abortControllerRef.current = null;
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

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

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
          { userId, signal: controller.signal }
        );
      } catch (caughtError) {
        const isAbortError =
          caughtError instanceof Error &&
          caughtError.message.includes('kullanıcı tarafından durduruldu');

        if (!isAbortError) {
          logger.error(
            'QuizGeneration',
            'startGeneration',
            'Üretim başlatılamadı:',
            caughtError as Error
          );
        }

        setGeneration((previousState) => ({
          ...previousState,
          isGenerating: false,
        }));
        abortControllerRef.current = null;
      }
    },
    [createGenerationCallbacks]
  );

  const stopGeneration = useCallback(() => {
    if (!abortControllerRef.current) return;

    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setGeneration((previousState) => ({
      ...previousState,
      isGenerating: false,
      logs: [
        {
          id: 'ai-abort-' + Date.now(),
          message: 'İşlem kullanıcı tarafından durduruldu.',
          step: 'ERROR' as GenerationStep,
          details: {},
          timestamp: new Date(),
        },
        ...previousState.logs,
      ].slice(0, MAX_LOG_ENTRIES),
    }));
  }, []);

  const resetGeneration = useCallback(() => {
    setGeneration(INITIAL_GENERATION_STATE);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return useMemo(
    () => ({
      generation,
      startGeneration,
      stopGeneration,
      resetGeneration,
      createGenerationCallbacks,
    }),
    [
      generation,
      startGeneration,
      stopGeneration,
      resetGeneration,
      createGenerationCallbacks,
    ]
  );
}
