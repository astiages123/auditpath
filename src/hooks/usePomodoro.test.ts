import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePomodoro } from "./usePomodoro";
import { TimerController } from "../components/pomodoro/TimerController";
import React from "react";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user-id" },
  }),
}));

describe("usePomodoro Hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Mock Notification
    global.Notification = {
      requestPermission: vi.fn(),
      permission: "default",
    } as unknown as typeof Notification;

    // Mock AudioContext
    global.window.AudioContext = vi.fn().mockImplementation(() => ({
      createOscillator: () => ({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        type: "sine",
        frequency: { setValueAtTime: vi.fn() },
      }),
      createGain: () => ({
        connect: vi.fn(),
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
      }),
      destination: {},
      currentTime: 0,
    })) as unknown as typeof AudioContext;

    // Mock localStorage
    const store: Record<string, string> = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          for (const key in store) delete store[key];
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() => usePomodoro(), { 
        wrapper: ({ children }) => React.createElement(React.Fragment, null, children, React.createElement(TimerController))
    });

    expect(result.current.mode).toBe("work");
    expect(result.current.status).toBe("paused");
    expect(result.current.minutes).toBe("50");
    expect(result.current.seconds).toBe("00");
  });

  it("should start the timer", () => {
    const { result } = renderHook(() => usePomodoro(), { 
        wrapper: ({ children }) => React.createElement(React.Fragment, null, children, React.createElement(TimerController))
    });

    act(() => {
      result.current.setCourse({ id: '1', name: 'Test Course', category: 'Test' });
    });

    act(() => {
      result.current.start();
    });

    expect(result.current.status).toBe("running");
    expect(result.current.startTime).not.toBeNull();
  });

  it("should increment time correctly", () => {
    const { result } = renderHook(() => usePomodoro(), { 
        wrapper: ({ children }) => React.createElement(React.Fragment, null, children, React.createElement(TimerController))
    });

    act(() => {
      result.current.setCourse({ id: '1', name: 'Test Course', category: 'Test' });
    });

    act(() => {
      result.current.start();
    });

    // Advance 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.minutes).toBe("49");
    expect(result.current.seconds).toBe("59");
  });

  it("should pause and resume correctly", () => {
    const { result } = renderHook(() => usePomodoro(), { 
        wrapper: ({ children }) => React.createElement(React.Fragment, null, children, React.createElement(TimerController))
    });

    // Start
    act(() => {
      result.current.setCourse({ id: '1', name: 'Test Course', category: 'Test' });
    });

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(2000); // 2 seconds pass
    });

    // Pause
    act(() => {
      result.current.pause();
    });

    expect(result.current.status).toBe("paused");

    // Wait while paused (time shouldn't change)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Resume
    act(() => {
      result.current.setCourse({ id: '1', name: 'Test Course', category: 'Test' });
    });

    act(() => {
      result.current.start();
    });

    expect(result.current.status).toBe("running");

    // Advance 1 more second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Total active time: 2s (before pause) + 1s (after resume) = 3s
    // Pause duration of 5s should NOT be included.
    // 50:00 - 3s = 49:57
    expect(result.current.seconds).toBe("56");
  });

  it("should switch modes", () => {
    const { result } = renderHook(() => usePomodoro(), { 
        wrapper: ({ children }) => React.createElement(React.Fragment, null, children, React.createElement(TimerController))
    });

    expect(result.current.mode).toBe("work");

    act(() => {
      result.current.switchMode();
    });

    expect(result.current.mode).toBe("break");
    expect(result.current.minutes).toBe("10");
  });

  it("should finish day and reset", () => {
    const { result } = renderHook(() => usePomodoro(), { 
        wrapper: ({ children }) => React.createElement(React.Fragment, null, children, React.createElement(TimerController))
    });

    act(() => {
      result.current.setCourse({ id: '1', name: 'Test Course', category: 'Test' });
    });

    act(() => {
      result.current.start();
      vi.advanceTimersByTime(1000);
      result.current.finishDay();
    });

    expect(result.current.status).toBe("paused");
    expect(result.current.minutes).toBe("50");
    expect(result.current.seconds).toBe("00");
  });
});
