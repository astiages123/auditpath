import { useCallback, useEffect, useMemo } from 'react';
import { useQuizTimerStore } from '@/features/quiz/store';

// ============================================================================
// HOOK
// ============================================================================

/**
 * Quiz süresini yöneten ve merkezi store ile senkronize çalışan hook.
 * Soruların ne kadar sürede çözüldüğünü takip etmek için kullanılır.
 *
 * @returns {Object} { startTimer, stopTimer, resetTimer }
 */
export function useQuizTimer() {
  // === SIDE EFFECTS ===

  useEffect(() => {
    // Bileşen unmount olduğunda durumu temizle
    return () => {
      try {
        useQuizTimerStore.getState().clear();
      } catch (err) {
        console.error('[useQuizTimer][unmount] Hata:', err);
      }
    };
  }, []);

  // === ACTIONS ===

  /** Zamanlayıcıyı başlatır */
  const startTimer = useCallback(() => {
    try {
      useQuizTimerStore.getState().start();
    } catch (err) {
      console.error('[useQuizTimer][startTimer] Hata:', err);
    }
  }, []);

  /** Zamanlayıcıyı durdurur ve geçen süreyi MS cinsinden döner */
  const stopTimer = useCallback(() => {
    try {
      return useQuizTimerStore.getState().stop();
    } catch (err) {
      console.error('[useQuizTimer][stopTimer] Hata:', err);
      return 0;
    }
  }, []);

  /** Zamanlayıcıyı sıfırlar */
  const resetTimer = useCallback(() => {
    try {
      useQuizTimerStore.getState().reset();
    } catch (err) {
      console.error('[useQuizTimer][resetTimer] Hata:', err);
    }
  }, []);

  // === RETURN ===
  return useMemo(
    () => ({
      startTimer,
      stopTimer,
      resetTimer,
    }),
    [startTimer, stopTimer, resetTimer]
  );
}
