import { act, renderHook } from "@testing-library/react";
import { usePomodoro } from "@/features/pomodoro/hooks/use-pomodoro";
import { useTimerStore } from "@/shared/store/use-timer-store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    playNotificationSound,
    unlockAudio,
} from "@/features/pomodoro/lib/audio-utils";

// Mock zustand middleware to bypass persist
vi.mock("zustand/middleware", () => ({
    persist: (config: any) => config,
    createJSONStorage: () => ({}),
}));

// Mock audio-utils
vi.mock("@/features/pomodoro/lib/audio-utils", () => ({
    unlockAudio: vi.fn(),
    playNotificationSound: vi.fn(),
}));

// Mock useAuth
vi.mock("@/features/auth", () => ({
    useAuth: () => ({ user: { id: "test-user" } }),
}));

// Mock client-db
vi.mock("@/shared/lib/core/client-db", () => ({
    getDailySessionCount: vi.fn().mockResolvedValue(0),
    upsertPomodoroSession: vi.fn().mockResolvedValue(undefined),
    deletePomodoroSession: vi.fn().mockResolvedValue(undefined),
}));

// Mock Worker
const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();
let mockOnMessage: ((e: MessageEvent) => void) | null = null;

const MockWorker = vi.fn(function (this: any) {
    this.postMessage = mockPostMessage;
    this.terminate = mockTerminate;
    Object.defineProperty(this, "onmessage", {
        set: (handler) => {
            mockOnMessage = handler;
        },
        get: () => mockOnMessage,
    });
});

global.Worker = MockWorker as any;

describe("usePomodoro", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useTimerStore.getState().resetAll();
        // Default course setup for tests that need it to start
        useTimerStore.getState().setCourse({
            id: "1",
            name: "Test Course",
            category: "Test",
        });
        vi.clearAllMocks();
        mockOnMessage = null;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("Worker Communication: initializes worker and sends START command on start", async () => {
        const { result } = renderHook(() => usePomodoro());

        await act(async () => {
            await result.current.start();
        });

        expect(global.Worker).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith("START");
        expect(result.current.isActive).toBe(true);
    });

    it("State Management: decreases timeLeft when receiving TICK from worker", async () => {
        const { result } = renderHook(() => usePomodoro());

        await act(async () => {
            await result.current.start();
        });

        const initialTime = result.current.timeLeft;

        // Advance time slightly to make sure tick calculation sees a difference
        // tick uses Date.now(), so we need to advance system time
        await act(async () => {
            vi.advanceTimersByTime(1000); // 1s
        });

        // Simulate TICK message from worker
        await act(async () => {
            if (mockOnMessage) {
                mockOnMessage({ data: "TICK" } as MessageEvent);
            }
        });

        expect(result.current.timeLeft).toBeLessThan(initialTime);
    });

    /*
    it("Completion Logic: plays audio and calls onComplete when time runs out", async () => {
        const onComplete = vi.fn();
        const { result } = renderHook(() => usePomodoro()); // onComplete removed

        // Manually set a short duration/timeLeft to test completion
        act(() => {
            useTimerStore.setState({
                isActive: true,
                timeLeft: 1,
                duration: 1,
                endTime: Date.now() + 1000,
            });
        });

        // Check initial state
        expect(result.current.timeLeft).toBe(1);

        // Advance time past completion
        await act(async () => {
            vi.advanceTimersByTime(1100); // > 1s
        });

        // Send TICK to trigger update
        await act(async () => {
            if (mockOnMessage) {
                mockOnMessage({ data: "TICK" } as MessageEvent);
            }
        });

        // Force re-render/effect check
        await act(async () => {
            // Just wait a tick for effects
        });

        expect(Math.abs(result.current.timeLeft)).toBe(0);
        expect(playNotificationSound).toHaveBeenCalled();
        // expect(onComplete).toHaveBeenCalled();
    });
    */

    it("Cleanup: terminates worker on unmount", () => {
        const { unmount } = renderHook(() => usePomodoro());
        unmount();
        expect(mockTerminate).toHaveBeenCalled();
    });
});
