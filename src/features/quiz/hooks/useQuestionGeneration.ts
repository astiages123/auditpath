import { useCallback, useEffect, useMemo, useState } from 'react';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { getChunkQuotaStatus } from '@/features/quiz/services/quizQuestionService';
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

interface UseQuestionGenerationProps {
  chunkId: string;
  onComplete?: () => void;
  open: boolean;
}

export function useQuestionGeneration({
  chunkId,
  onComplete,
  open,
}: UseQuestionGenerationProps) {
  const [genState, setGenState] = useState({
    loading: false,
    status: 'idle' as 'idle' | 'generating' | 'saving' | 'success' | 'error',
    logs: [] as string[],
    liveStreamLogs: [] as GenerationLog[],
    currentStep: 0,
    savedCount: 0,
  });
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [initializing, setInitializing] = useState(false);
  const { user } = useAuth();

  const refreshStatus = useCallback(async () => {
    try {
      const newStatus = await getChunkQuotaStatus(chunkId);
      if (newStatus) {
        setStatus(newStatus);
      }
    } catch (e) {
      logger.error('Quota info fetch error', e as Error);
      toast.error('Kota bilgisi alınamadı.');
    }
  }, [chunkId]);

  useEffect(() => {
    Promise.resolve().then(() => refreshStatus());
  }, [refreshStatus]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status?.status === 'PROCESSING') {
      interval = setInterval(refreshStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [refreshStatus, status?.status]);

  useEffect(() => {
    if (open) {
      const initialize = async () => {
        setGenState({
          loading: false,
          status: 'idle',
          logs: [],
          liveStreamLogs: [],
          currentStep: 0,
          savedCount: 0,
        });
        setInitializing(true);
        await refreshStatus();
        setInitializing(false);
      };
      initialize();
    }
  }, [open, refreshStatus]);

  const handleGenerate = async () => {
    if (!status) return;

    setGenState((prev) => ({
      ...prev,
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
            setGenState((prev) => ({
              ...prev,
              liveStreamLogs: [...prev.liveStreamLogs, log],
              currentStep: simplifiedStepMap[log.step] || 0,
              logs: [...prev.logs, log.message],
            }));

            if (log.step === 'MAPPING' && log.details?.conceptCount) {
              setStatus((prev) =>
                prev
                  ? {
                      ...prev,
                      conceptCount:
                        Number(log.details.conceptCount) || prev.conceptCount,
                    }
                  : prev
              );
            }
          },
          onQuestionSaved: (count: number) => {
            setGenState((prev) => ({
              ...prev,
              savedCount: count,
            }));
            setStatus((prev: QuotaStatus | null) =>
              prev ? { ...prev, used: prev.used + 1 } : prev
            );
          },
          onComplete: (result: { success: boolean; generated: number }) => {
            setGenState((prev) => ({
              ...prev,
              loading: false,
              status: result.success ? 'success' : 'error',
              currentStep: result.success ? 3 : prev.currentStep,
            }));
            refreshStatus();
            onComplete?.();

            if (result.success) {
              toast.success(`${result.generated} soru başarıyla üretildi!`);
            }
          },
          onError: (error: unknown) => {
            setGenState((prev) => ({
              ...prev,
              loading: false,
              status: 'error',
            }));
            toast.error(String(error));
          },
        },
        { userId: user?.id }
      );
    } catch (err: unknown) {
      logger.error('[QuizGen] Kritik hata:', err as Error);
      const errorMessage =
        err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu';
      setGenState((prev) => ({
        ...prev,
        status: 'error',
        loading: false,
        logs: [...prev.logs, `Hata: ${errorMessage}`],
      }));
      toast.error(
        err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      );
    }
  };

  const currentStepInfo = useMemo(() => {
    if (genState.liveStreamLogs.length === 0) return undefined;
    const lastLog = genState.liveStreamLogs[genState.liveStreamLogs.length - 1];
    return {
      step: lastLog.step as LogStep,
      progress: stepProgress[lastLog.step as LogStep] || 0,
    };
  }, [genState.liveStreamLogs]);

  const resetStatus = useCallback(() => {
    setGenState((prev) => ({ ...prev, status: 'idle' }));
  }, []);

  return {
    genState,
    status,
    initializing,
    handleGenerate,
    currentStepInfo,
    resetStatus,
  };
}
