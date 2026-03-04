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

// ============================================================================
// CONSTANTS & MAPPINGS
// ============================================================================

/** Log basamaklarının UI basamaklarına (0-3) eşleşmesi */
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

/** Log basamaklarının yüzde bazlı ilerleme değerleri */
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

// ============================================================================
// TYPES
// ============================================================================

export interface UseQuestionGenerationProps {
  /** Hedef ünite ID'si */
  chunkId: string;
  /** İşlem tamamlandığında tetiklenecek callback */
  onComplete?: () => void;
  /** Dialog/Görünüm açık mı? */
  open: boolean;
}

export interface GenerationProgressState {
  /** İşlem devam ediyor mu? */
  loading: boolean;
  /** Mevcut durum */
  status: 'idle' | 'generating' | 'saving' | 'success' | 'error';
  /** Basit metin logları */
  logs: string[];
  /** Yapısal log akışı */
  liveStreamLogs: GenerationLog[];
  /** Mevcut adım indeksi (0-3) */
  currentStep: number;
  /** Üretilen/Kaydedilen soru sayısı */
  savedCount: number;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Belirli bir konu parçası (chunk) için yeni soru üretim sürecini yöneten hook.
 * Üretim durumunu, ilerlemeyi ve kota bilgilerini takip eder.
 *
 * @param {UseQuestionGenerationProps} props - Hook parametreleri
 * @returns {Object} Üretim durumu ve kontrol fonksiyonları
 */
export function useQuestionGeneration({
  chunkId,
  onComplete,
  open,
}: UseQuestionGenerationProps) {
  // === STATE ===

  const [genState, setGenState] = useState<GenerationProgressState>({
    loading: false,
    status: 'idle',
    logs: [],
    liveStreamLogs: [],
    currentStep: 0,
    savedCount: 0,
  });

  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [initializing, setInitializing] = useState(false);
  const { user } = useAuth();

  // === HANDLERS ===

  /** Kota bilgisini ve üretim durumunu günceller */
  const refreshStatus = useCallback(async () => {
    try {
      const newStatus = await getChunkQuotaStatus(chunkId, user?.id);
      if (newStatus) {
        setStatus(newStatus);
      }
    } catch (e) {
      console.error('[useQuestionGeneration][refreshStatus] Hata:', e);
      logger.error(
        'QuestionGeneration',
        'refreshStatus',
        'Kota bilgisi alınamadı:',
        e as Error
      );
      toast.error('Kota bilgisi alınamadı.');
    }
  }, [chunkId, user]);

  /** Soru üretim sürecini başlatır */
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
                        Number(log.details?.conceptCount) || prev.conceptCount,
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
            setStatus((prev) =>
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
            console.error(
              '[useQuestionGeneration][handleGenerate][onError] Hata:',
              error
            );
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
      console.error(
        '[useQuestionGeneration][handleGenerate] Kritik Hata:',
        err
      );
      logger.error(
        'QuestionGeneration',
        'handleGenerate',
        'Kritik üretim hatası:',
        err as Error
      );
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

  /** Durumu sıfırlar */
  const resetStatus = useCallback(() => {
    setGenState((prev) => ({ ...prev, status: 'idle' }));
  }, []);

  // === DERIVED STATE ===

  /** Mevcut üretim aşaması ve yüzde bilgisini hesaplar */
  const currentStepInfo = useMemo(() => {
    if (genState.liveStreamLogs.length === 0) return undefined;
    const lastLog = genState.liveStreamLogs[genState.liveStreamLogs.length - 1];
    return {
      step: lastLog.step as LogStep,
      progress: stepProgress[lastLog.step as LogStep] || 0,
    };
  }, [genState.liveStreamLogs]);

  // === EFFECTS ===

  /** Kota bilgisini periyodik olarak kontrol eder */
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

  /** Dialog açıldığında durumu hazırlar */
  useEffect(() => {
    if (open) {
      const initialize = async () => {
        // Ensure state updates happen after initial render to satisfy React Compiler / strictly linted effects
        await Promise.resolve();
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

  // === RETURN ===

  return {
    genState,
    status,
    initializing,
    handleGenerate,
    currentStepInfo,
    resetStatus,
  };
}
