// @vitest-environment jsdom
vi.mock('zustand/middleware', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zustand/middleware')>();
  return {
    ...actual,
    persist: (config: unknown) => (set: unknown, get: unknown, api: unknown) =>
      (config as (set: unknown, get: unknown, api: unknown) => unknown)(
        set,
        get,
        api
      ),
  };
});
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Robust localStorage mock - hoisted before store import
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

// Import store after global mock setup
import { useTimerStore } from '../../features/pomodoro/store/useTimerStore';
import {
  POMODORO_BREAK_DURATION_SECONDS,
  POMODORO_WORK_DURATION_SECONDS,
} from '../../features/pomodoro/utils/constants';

describe('useTimerStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // We need to reset the store manually because Zustand persist might
    // keep state between tests if not handled.
    const store = useTimerStore.getState();
    store.resetTimer(POMODORO_WORK_DURATION_SECONDS);
    store.setMode('work');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Başlangıç durumu doğrudur', () => {
    const state = useTimerStore.getState();
    expect(state.timeLeft).toBe(POMODORO_WORK_DURATION_SECONDS);
    expect(state.isActive).toBe(false);
    expect(state.isBreak).toBe(false);
  });

  it('2. startTimer timerı aktif hale getirir', () => {
    useTimerStore.getState().startTimer();
    const state = useTimerStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.startTime).not.toBeNull();
    expect(state.endTime).toBeGreaterThan(Date.now());
  });

  it('3. tick fonksiyonu timeLeft değerini günceller', () => {
    const store = useTimerStore.getState();
    store.startTimer();

    // Fast-forward 10 seconds
    vi.advanceTimersByTime(10000);
    store.tick();

    const newState = useTimerStore.getState();
    expect(newState.timeLeft).toBe(POMODORO_WORK_DURATION_SECONDS - 10);
  });

  it('4. pauseTimer timerı durdurur ve timeLeftı korur', () => {
    const store = useTimerStore.getState();
    store.startTimer();

    vi.advanceTimersByTime(5000);
    store.pauseTimer();

    const stateAfterPause = useTimerStore.getState();
    expect(stateAfterPause.isActive).toBe(false);
    expect(stateAfterPause.timeLeft).toBe(POMODORO_WORK_DURATION_SECONDS - 5);
  });

  it('5. setMode mola veya çalışma moduna geçer ve süreyi sıfırlar', () => {
    const store = useTimerStore.getState();

    store.setMode('break');
    let state = useTimerStore.getState();
    expect(state.isBreak).toBe(true);
    expect(state.timeLeft).toBe(POMODORO_BREAK_DURATION_SECONDS);

    store.setMode('work');
    state = useTimerStore.getState();
    expect(state.isBreak).toBe(false);
    expect(state.timeLeft).toBe(POMODORO_WORK_DURATION_SECONDS);
  });

  it('6. resetTimer süre ve durumu sıfırlar', () => {
    const store = useTimerStore.getState();
    store.startTimer();
    vi.advanceTimersByTime(10000);

    store.resetTimer();
    const state = useTimerStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.timeLeft).toBe(POMODORO_WORK_DURATION_SECONDS);
  });
});
