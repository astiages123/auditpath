import { useCallback } from 'react';
import { QuizPhase } from '@/features/quiz/hooks/useQuizManager';
import { QuizResults, QuizState, SessionContext } from '@/features/quiz/types';
import { TopicWithCounts } from '@/features/courses/types/courseTypes';
import { logger } from '@/utils/logger';
import { storage } from '@/shared/services/storageService';

// ============================================================================
// TYPES
// ============================================================================

export interface ManagerPersistedState {
  /** Seçili konu */
  selectedTopic: TopicWithCounts | null;
  /** Mevcut quiz evresi */
  phase: QuizPhase;
  /** Sınav aktif mi? */
  isQuizActive: boolean;
  /** Kayıt zamanı (ISO 8601) */
  savedAt: string;
}

export interface EnginePersistedState {
  /** Quiz motor durumu */
  state: QuizState;
  /** Oturum sonuçları */
  results: QuizResults;
  /** Seans bağlamı */
  sessionContext: SessionContext | null;
  /** Kayıt zamanı (ISO 8601) */
  savedAt: string;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Quiz durumunu (manager ve engine) yerel depolamada (localStorage) saklayan ve yükleyen hook.
 * Sayfa yenilemelerinde veya uygulama kapanıp açıldığında ilerlemeyi korur.
 *
 * @param courseId - Mevcut dersin kimliği
 * @returns Veri saklama ve yükleme fonksiyonları
 */
export function useQuizPersistence(courseId: string) {
  // === KEYS ===
  const quizManagerKey = `quiz-manager-${courseId}`;
  const quizEngineKey = `quiz-engine-${courseId}`;

  // === MANAGER PERSISTENCE ===

  /** Manager durumunu yerel depolamadan yükler */
  const loadManager = useCallback((): ManagerPersistedState | null => {
    return storage.get<ManagerPersistedState>(quizManagerKey);
  }, [quizManagerKey]);

  /** Manager durumunu kaydeder */
  const saveManager = useCallback(
    (
      selectedTopic: TopicWithCounts | null,
      phase: QuizPhase,
      isQuizActive: boolean
    ) => {
      const stateToSave: ManagerPersistedState = {
        selectedTopic,
        phase,
        isQuizActive,
        savedAt: new Date().toISOString(),
      };
      storage.set(quizManagerKey, stateToSave);
    },
    [quizManagerKey]
  );

  // === ENGINE PERSISTENCE ===

  /** Engine durumunu yerel depolamadan yükler */
  const loadEngine = useCallback((): EnginePersistedState | null => {
    return storage.get<EnginePersistedState>(quizEngineKey);
  }, [quizEngineKey]);

  /** Engine durumunu kaydeder */
  const saveEngine = useCallback(
    (
      state: QuizState,
      results: QuizResults,
      sessionContext: SessionContext | null
    ) => {
      if (!state.hasStarted) return;
      const stateToSave: EnginePersistedState = {
        state,
        results,
        sessionContext,
        savedAt: new Date().toISOString(),
      };
      storage.set(quizEngineKey, stateToSave);
    },
    [quizEngineKey]
  );

  // === UTILS ===

  /** Tüm kayıtlı durumları temizler */
  const clear = useCallback(() => {
    try {
      storage.remove(quizManagerKey);
      storage.remove(quizEngineKey);
      storage.remove(`quiz-${courseId}`);
    } catch (error) {
      console.error('[useQuizPersistence][clear] Hata:', error);
      logger.error(
        'QuizPersistence',
        'clear',
        'Temizleme hatası:',
        error as Error
      );
    }
  }, [courseId, quizManagerKey, quizEngineKey]);

  /** Sadece engine durumunu yerel depolamadan temizler */
  const clearEngine = useCallback(() => {
    try {
      storage.remove(quizEngineKey);
    } catch (error) {
      console.error('[useQuizPersistence][clearEngine] Hata:', error);
      logger.error(
        'QuizPersistence',
        'clearEngine',
        'Temizleme hatası:',
        error as Error
      );
    }
  }, [quizEngineKey]);

  // === RETURN ===

  return {
    loadManager,
    saveManager,
    loadEngine,
    saveEngine,
    clear,
    clearEngine,
  };
}
