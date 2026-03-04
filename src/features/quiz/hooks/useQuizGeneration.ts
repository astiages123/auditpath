import { useCallback, useEffect, useRef, useState } from 'react';
import { generateForChunk } from '@/features/quiz/logic/quizParser';
import { GenerationLog, type GenerationStep } from '@/features/quiz/types';
import { logger } from '@/utils/logger';
import { MAX_LOG_ENTRIES } from '../utils/constants';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Soru üretme sürecinin durumunu temsil eden arayüz.
 */
export interface GenerationState {
  /** Üretim devam ediyor mu? */
  isGenerating: boolean;
  /** Üretim sırasında oluşan loglar */
  logs: GenerationLog[];
  /** İlerleme durumu (mevcut / toplam) */
  progress: { current: number; total: number };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INITIAL_GENERATION_STATE: GenerationState = {
  isGenerating: false,
  logs: [],
  progress: { current: 0, total: 0 },
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Quiz sorularının AI tarafından üretilme sürecini yöneten hook.
 * Üretim loglarını, ilerlemeyi ve hata durumlarını takip eder.
 *
 * @returns {Object} { generation, startGeneration, resetGeneration, createGenerationCallbacks }
 */
export function useQuizGeneration() {
  // === STATE ===

  const [generation, setGeneration] = useState<GenerationState>(
    INITIAL_GENERATION_STATE
  );

  // İptal mekanizması için controller ref'i
  const abortControllerRef = useRef<AbortController | null>(null);

  // === CALLBACKS ===

  /**
   * Üretim süreci için gerekli callback fonksiyonlarını oluşturur.
   *
   * @param onCompleteExtra - Üretim tamamlandığında çalıştırılacak ek fonksiyon
   */
  const createGenerationCallbacks = useCallback(
    (onCompleteExtra?: () => void | Promise<void>) => ({
      /** Yeni bir teknik log eklendiğinde */
      onLog: (log: GenerationLog) =>
        setGeneration((prev) => ({
          ...prev,
          logs: [log, ...prev.logs].slice(0, MAX_LOG_ENTRIES),
        })),
      /** Toplam hedef soru sayısı hesaplandığında */
      onTotalTargetCalculated: (total: number) =>
        setGeneration((prev) => ({
          ...prev,
          progress: { ...prev.progress, total },
        })),
      /** Bir soru başarıyla kaydedildiğinde */
      onQuestionSaved: (count: number) =>
        setGeneration((prev) => ({
          ...prev,
          progress: { ...prev.progress, current: count },
        })),
      /** Üretim süreci başarıyla tamamlandığında */
      onComplete: async () => {
        try {
          if (onCompleteExtra) {
            await onCompleteExtra();
          }
        } catch (err) {
          console.error('[useQuizGeneration][onCompleteExtra] Hata:', err);
        } finally {
          setGeneration((prev) => ({ ...prev, isGenerating: false }));
          abortControllerRef.current = null;
        }
      },
      /** Üretim sırasında bir hata oluştuğunda */
      onError: (err: string) => {
        const isAbort = err.includes('kullanıcı tarafından durduruldu');

        console.error('[useQuizGeneration][onError] Hata:', err);
        if (!isAbort) {
          logger.error(
            'QuizGeneration',
            'createGenerationCallbacks',
            'Üretim hatası:',
            { message: err }
          );
        }
        setGeneration((prev) => ({ ...prev, isGenerating: false }));
        abortControllerRef.current = null;
      },
    }),
    []
  );

  // === ACTIONS ===

  /**
   * Belirli bir konu parçası (chunk) için soru üretimini başlatır.
   *
   * @param targetChunkId - Hedef ünite ID'si
   * @param onComplete - Tamamlandığında çalışacak callback
   * @param userId - Kullanıcı ID'si (opsiyonel)
   */
  const startGeneration = useCallback(
    async (
      targetChunkId: string,
      onComplete?: () => void | Promise<void>,
      userId?: string
    ) => {
      if (!targetChunkId) return;

      // Önceki işlemi iptal et
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
      } catch (error) {
        // Kontrol generateForChunk'ın içinden de fırlatılmış olabilir
        const isAbortError =
          error instanceof Error &&
          error.message.includes('kullanıcı tarafından durduruldu');

        if (!isAbortError) {
          console.error('[useQuizGeneration][startGeneration] Hata:', error);
          logger.error(
            'QuizGeneration',
            'startGeneration',
            'Üretim başlatılamadı:',
            error as Error
          );
        }

        setGeneration((prev) => ({ ...prev, isGenerating: false }));
        abortControllerRef.current = null;
      }
    },
    [createGenerationCallbacks]
  );

  /** Üretim sürecini dışarıdan (UI vb.) durdurmak için çağrılır */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setGeneration((prev) => ({
        ...prev,
        isGenerating: false,
        logs: [
          {
            id: 'ai-abort-' + Date.now(),
            message: 'İşlem kullanıcı tarafından durduruldu.',
            step: 'ERROR' as GenerationStep,
            details: {},
            timestamp: new Date(),
          },
          ...prev.logs,
        ].slice(0, MAX_LOG_ENTRIES),
      }));
    }
  }, []);

  /** Üretim durumunu sıfırlar */
  const resetGeneration = useCallback(() => {
    setGeneration(INITIAL_GENERATION_STATE);
  }, []);

  // Bileşen unmount olduğunda varsa isteği iptal et
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // === RETURN ===

  return {
    generation,
    startGeneration,
    stopGeneration,
    resetGeneration,
    createGenerationCallbacks,
  };
}
