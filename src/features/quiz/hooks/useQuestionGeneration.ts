import { useCallback, useEffect, useMemo, useState } from 'react';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { getChunkQuotaStatus } from '@/features/quiz/services/quizStatusService';
import { generateForChunk } from '@/features/quiz/logic/quizParser';
import {
  type GenerationLog,
  type GenerationStep as LogStep,
  type QuotaStatus,
} from '@/features/quiz/types';
import { useAuth } from '@/features/auth/hooks/useAuth';

const simplifiedStepMap: Record<LogStep, number> = {
  INIT: 0,
  MAPPING: 0,
  GENERATING: 1,
  VALIDATING: 2,
  REVISION: 2,
  SAVING: 2,
  COMPLETED: 3,
  ERROR: 0,
};

const stepProgress: Record<LogStep, number> = {
  INIT: 5,
  MAPPING: 20,
  GENERATING: 50,
  VALIDATING: 75,
  REVISION: 85,
  SAVING: 90,
  COMPLETED: 100,
  ERROR: 0,
};

export interface UseQuestionGenerationProps {
  chunkId: string;
  onComplete?: () => void;
  open: boolean;
}

export interface GenerationProgressState {
  loading: boolean;
  status: 'idle' | 'generating' | 'saving' | 'success' | 'error';
  logs: string[];
  liveStreamLogs: GenerationLog[];
  currentStep: number;
  savedCount: number;
}

export function useQuestionGeneration({
  chunkId,
  onComplete,
  open: isOpen,
}: UseQuestionGenerationProps) {
  const [generationState, setGenerationState] =
    useState<GenerationProgressState>({
      loading: false,
      status: 'idle',
      logs: [],
      liveStreamLogs: [],
      currentStep: 0,
      savedCount: 0,
    });

  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const { user } = useAuth();

  const refreshStatus = useCallback(async () => {
    try {
      const nextStatus = await getChunkQuotaStatus(chunkId, user?.id);
      if (nextStatus) {
        setStatus(nextStatus);
      }
    } catch (caughtError) {
      logger.error(
        'QuestionGeneration',
        'refreshStatus',
        'Kota bilgisi alınamadı:',
        caughtError as Error
      );
      toast.error('Kota bilgisi alınamadı.');
    }
  }, [chunkId, user]);

  const handleGenerate = async () => {
    if (!status) return;

    setGenerationState((previousState) => ({
      ...previousState,
      loading: true,
      status: 'generating',
      logs: ['Yapay zeka motoru başlatılıyor...'],
      liveStreamLogs: [],
      currentStep: 0,
      savedCount: 0,
    }));

    try {
      await generateForChunk(
        chunkId,
        {
          onTotalTargetCalculated: () => {},
          onLog: (log: GenerationLog) => {
            setGenerationState((previousState) => ({
              ...previousState,
              liveStreamLogs: [...previousState.liveStreamLogs, log],
              currentStep: simplifiedStepMap[log.step] || 0,
              logs: [...previousState.logs, log.message],
            }));

            if (log.step === 'MAPPING' && log.details?.conceptCount) {
              setStatus((previousStatus) =>
                previousStatus
                  ? {
                      ...previousStatus,
                      conceptCount:
                        Number(log.details?.conceptCount) ||
                        previousStatus.conceptCount,
                    }
                  : previousStatus
              );
            }
          },
          onQuestionSaved: (count: number) => {
            setGenerationState((previousState) => ({
              ...previousState,
              savedCount: count,
            }));
            setStatus((previousStatus) =>
              previousStatus
                ? { ...previousStatus, used: previousStatus.used + 1 }
                : previousStatus
            );
          },
          onComplete: (result: { success: boolean; generated: number }) => {
            setGenerationState((previousState) => ({
              ...previousState,
              loading: false,
              status: result.success ? 'success' : 'error',
              currentStep: result.success ? 3 : previousState.currentStep,
            }));
            refreshStatus();
            onComplete?.();

            if (result.success) {
              toast.success(`${result.generated} soru başarıyla üretildi!`);
            }
          },
          onError: (caughtError: unknown) => {
            setGenerationState((previousState) => ({
              ...previousState,
              loading: false,
              status: 'error',
            }));
            toast.error(String(caughtError));
          },
        },
        { userId: user?.id }
      );
    } catch (caughtError: unknown) {
      logger.error(
        'QuestionGeneration',
        'handleGenerate',
        'Kritik üretim hatası:',
        caughtError as Error
      );
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : 'Bilinmeyen bir hata oluştu';
      setGenerationState((previousState) => ({
        ...previousState,
        status: 'error',
        loading: false,
        logs: [...previousState.logs, `Hata: ${errorMessage}`],
      }));
      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : 'Beklenmeyen bir hata oluştu.'
      );
    }
  };

  const resetStatus = useCallback(() => {
    setGenerationState((previousState) => ({
      ...previousState,
      status: 'idle',
    }));
  }, []);

  const currentStepInfo = useMemo(() => {
    if (generationState.liveStreamLogs.length === 0) return undefined;
    const lastLog =
      generationState.liveStreamLogs[generationState.liveStreamLogs.length - 1];
    return {
      step: lastLog.step as LogStep,
      progress: stepProgress[lastLog.step as LogStep] || 0,
    };
  }, [generationState.liveStreamLogs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshStatus();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshStatus]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status?.status === 'PROCESSING') {
      interval = setInterval(refreshStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [refreshStatus, status?.status]);

  useEffect(() => {
    if (isOpen) {
      let isCancelled = false;
      const timer = setTimeout(() => {
        if (!isCancelled) {
          setIsInitializing(true);
        }
        refreshStatus().finally(() => {
          if (!isCancelled) {
            setIsInitializing(false);
          }
        });
      }, 0);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }

    const timer = setTimeout(() => {
      setIsInitializing(false);
      resetStatus();
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, refreshStatus, resetStatus]);

  return {
    ...generationState,
    statusInfo: status,
    refreshStatus,
    handleGenerate,
    resetStatus,
    currentStepInfo,
    initializing: isInitializing,
  };
}
