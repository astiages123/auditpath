import { useCallback, useState } from 'react';
import { generateForChunk } from '@/features/quiz/logic/quizParser';
import { GenerationLog } from '@/features/quiz/types';
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
        }
      },
      /** Üretim sırasında bir hata oluştuğunda */
      onError: (err: string) => {
        console.error('[useQuizGeneration][onError] Hata:', err);
        logger.error(
          'QuizGeneration',
          'createGenerationCallbacks',
          'Üretim hatası:',
          { message: err }
        );
        setGeneration((prev) => ({ ...prev, isGenerating: false }));
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
        console.error('[useQuizGeneration][startGeneration] Hata:', error);
        logger.error(
          'QuizGeneration',
          'startGeneration',
          'Üretim başlatılamadı:',
          error as Error
        );
        setGeneration((prev) => ({ ...prev, isGenerating: false }));
      }
    },
    [createGenerationCallbacks]
  );

  /** Üretim durumunu sıfırlar */
  const resetGeneration = useCallback(() => {
    setGeneration(INITIAL_GENERATION_STATE);
  }, []);

  // === RETURN ===

  return {
    generation,
    startGeneration,
    resetGeneration,
    createGenerationCallbacks,
  };
}
