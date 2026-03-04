import { create } from 'zustand';

// ============================================================================
// STATE TYPES
// ============================================================================

/**
 * Quiz zamanlayıcısı (timer) durumunu ve eylemlerini tanımlayan arayüz.
 * Bu store, quiz sırasında geçen süreyi milisaniye cinsinden takip eder
 * ve sayfa görünürlüğü (visibilitychange) değişikliklerine duyarlıdır.
 */
interface QuizTimerState {
  /** Zamanlayıcının son başlatıldığı zaman damgası (timestamp) */
  startTime: number | null;
  /** Daha önceki başlatmalardan biriken toplam süre (ms) */
  accumulatedTime: number;
  /** Zamanlayıcının şu an çalışıp çalışmadığı bilgisi */
  isRunning: boolean;
  /** Sayfa görünürlük dinleyicisinin (listener) ekli olup olmadığı */
  isListenerAttached: boolean;

  // Actions
  /** Zamanlayıcıyı başlatır ve gerekirse olay dinleyicisini ekler */
  start: () => void;
  /** Zamanlayıcıyı durdurur ve biriken toplam süreyi döner */
  stop: () => number;
  /** Zamanlayıcıyı sıfırlayıp yeniden başlatır */
  reset: () => void;
  /** Zamanlayıcıyı durdurur, süreyi sıfırlar ve dinleyiciyi kaldırır */
  clear: () => void;
  /** Geçen toplam süreyi (biriken + aktif) hesaplayıp milisaniye cinsinden döner */
  getTime: () => number;
  /** Sayfa görünürlüğü değiştiğinde (sekmeler arası geçiş vb.) süreyi günceller */
  handleVisibilityChange: () => void;
  /** window.document düzeyinde visibilitychange dinleyicisi ekler */
  attachListener: () => void;
  /** window.document düzeyindeki visibilitychange dinleyicisini kaldırır */
  detachListener: () => void;
}

// ============================================================================
// INITIAL STATE & STORE
// ============================================================================

/**
 * Quiz zamanlayıcısını (timer) yöneten Zustand store.
 * Bu store, uygulamanın farklı yerlerinden quiz süresine erişimi sağlar.
 */
export const useQuizTimerStore = create<QuizTimerState>((set, get) => ({
  startTime: null,
  accumulatedTime: 0,
  isRunning: false,
  isListenerAttached: false,

  // ============================================================================
  // STATE MANAGEMENT / HANDLERS
  // ============================================================================

  handleVisibilityChange: () => {
    const { startTime, isRunning } = get();

    // Sayfa gizlendiğinde (sekme değiştiğinde):
    // Eğer çalışıyorsa, geçen süreyi accumulatedTime'a ekle ve durdur.
    if (
      document.visibilityState === 'hidden' &&
      isRunning &&
      startTime !== null
    ) {
      set((state) => ({
        accumulatedTime: state.accumulatedTime + (Date.now() - startTime),
        startTime: null,
        isRunning: false,
      }));
    } // Sayfa tekrar görünür olduğunda:
    // Eğer önceden çalışıyorsa (veya başlatılması gerekiyorsa), yeni bir startTime ile başlat.
    else if (
      document.visibilityState === 'visible' &&
      !isRunning &&
      startTime === null
    ) {
      set({ startTime: Date.now(), isRunning: true });
    }
  },

  attachListener: () => {
    const { isListenerAttached, handleVisibilityChange } = get();
    if (typeof document !== 'undefined' && !isListenerAttached) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      set({ isListenerAttached: true });
    }
  },

  detachListener: () => {
    const { isListenerAttached, handleVisibilityChange } = get();
    if (typeof document !== 'undefined' && isListenerAttached) {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      set({ isListenerAttached: false });
    }
  },

  // ============================================================================
  // ACTIONS
  // ============================================================================

  start: () => {
    get().attachListener();
    const { startTime, isRunning } = get();
    if (!isRunning && startTime === null) {
      set({ startTime: Date.now(), isRunning: true });
    }
  },

  stop: () => {
    const { startTime, accumulatedTime, isRunning } = get();
    if (isRunning && startTime !== null) {
      const newAccumulated = accumulatedTime + (Date.now() - startTime);
      set({
        accumulatedTime: newAccumulated,
        startTime: null,
        isRunning: false,
      });
      return newAccumulated;
    }
    return accumulatedTime;
  },

  reset: () => {
    get().attachListener();
    set({
      startTime: Date.now(),
      accumulatedTime: 0,
      isRunning: true,
    });
  },

  clear: () => {
    get().detachListener();
    set({
      startTime: null,
      accumulatedTime: 0,
      isRunning: false,
    });
  },

  // ============================================================================
  // SELECTORS / GETTERS
  // ============================================================================

  getTime: () => {
    const { startTime, accumulatedTime, isRunning } = get();
    if (isRunning && startTime !== null) {
      return accumulatedTime + (Date.now() - startTime);
    }
    return accumulatedTime;
  },
}));
