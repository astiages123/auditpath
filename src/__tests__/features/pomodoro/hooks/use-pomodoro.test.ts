import { act, renderHook } from '@testing-library/react';
import { usePomodoro } from '@/features/pomodoro/hooks/use-pomodoro';
import { useTimerStore } from '@/shared/store/use-timer-store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 1. MOCK MERKEZİ
const workerMethods = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
};

let capturedHandler: ((e: MessageEvent) => void) | null = null;

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage = workerMethods.postMessage;
  terminate = workerMethods.terminate;
  constructor() {
    // onmessage atandığında capturedHandler'ı güncelle
    Object.defineProperty(this, 'onmessage', {
      set: (fn) => {
        capturedHandler = fn;
      },
      get: () => capturedHandler,
      configurable: true,
    });
    (global as { __INSTANCE__?: unknown }).__INSTANCE__ = this;
  }
  addEventListener(type: string, handler: (e: MessageEvent) => void) {
    if (type === 'message') capturedHandler = handler;
  }
  removeEventListener() {}
}

// 2. GLOBAL STUBBING
vi.stubGlobal('Worker', MockWorker);
vi.stubGlobal(
  'URL',
  class {
    constructor() {
      return {};
    }
  }
);
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });

// 3. ZUSTAND MOCK (Hatanın çözümü burada)
vi.mock('zustand/middleware', () => ({
  persist: (config: unknown) => config, // Persist'i devre dışı bırak, sadece config'i dön
  createJSONStorage: () => ({
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

vi.mock('@/features/pomodoro/lib/audio-utils', () => ({
  unlockAudio: vi.fn(),
  playNotificationSound: vi.fn(),
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

vi.mock('@/shared/lib/core/client-db', () => ({
  getDailySessionCount: vi.fn().mockResolvedValue(0),
  upsertPomodoroSession: vi.fn().mockResolvedValue(undefined),
  deletePomodoroSession: vi.fn().mockResolvedValue(undefined),
}));

describe('usePomodoro', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    useTimerStore.getState().resetAll();
    useTimerStore.getState().setCourse({
      id: '1',
      name: 'Test Course',
      category: 'Test',
    });
    vi.clearAllMocks();
    capturedHandler = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Worker Communication: initializes worker and sends START command', async () => {
    const { result } = renderHook(() => usePomodoro());

    await act(async () => {
      await result.current.start();
    });

    expect(workerMethods.postMessage).toHaveBeenCalledWith('START');
    expect(result.current.isActive).toBe(true);
  });

  it('State Management: decreases timeLeft when receiving TICK', async () => {
    const { result } = renderHook(() => usePomodoro());

    await act(async () => {
      await result.current.start();
    });

    const initialTime = result.current.timeLeft;

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      if (capturedHandler) {
        capturedHandler({ data: 'TICK' } as MessageEvent);
      }
    });

    expect(result.current.timeLeft).toBeLessThan(initialTime);
  });

  it('Cleanup: terminates worker on unmount', () => {
    const { unmount } = renderHook(() => usePomodoro());
    unmount();
    expect(workerMethods.terminate).toHaveBeenCalled();
  });
});
