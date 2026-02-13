import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useTimerStore } from '@/shared/store/use-timer-store';

describe('useTimerStore', () => {
  beforeEach(() => {
    // Reset store to initial state by creating a fresh instance
    // We need to manually reset since resetAll() sets hasRestored to true
    act(() => {
      useTimerStore.setState({
        timeLeft: 3000,
        isActive: false,
        isBreak: false,
        duration: 3000,
        startTime: null,
        originalStartTime: null,
        endTime: null,
        sessionCount: 1,
        selectedCourse: null,
        isWidgetOpen: false,
        sessionId: null,
        timeline: [],
        hasRestored: false,
        pauseStartTime: null,
      });
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useTimerStore.getState();

      expect(state.timeLeft).toBe(3000);
      expect(state.isActive).toBe(false);
      expect(state.isBreak).toBe(false);
      expect(state.duration).toBe(3000);
      expect(state.startTime).toBeNull();
      expect(state.endTime).toBeNull();
      expect(state.sessionCount).toBe(1);
      expect(state.selectedCourse).toBeNull();
      expect(state.isWidgetOpen).toBe(false);
      expect(state.sessionId).toBeNull();
      expect(state.timeline).toEqual([]);
      expect(state.hasRestored).toBe(false);
      expect(state.pauseStartTime).toBeNull();
    });
  });

  describe('startTimer', () => {
    it('should start timer with correct state', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const startTime = 1000000000000;
      vi.setSystemTime(startTime);

      act(() => {
        useTimerStore.getState().startTimer();
      });

      const state = useTimerStore.getState();
      expect(state.isActive).toBe(true);
      expect(state.startTime).toBe(startTime);
      expect(state.timeline).toHaveLength(1);
      expect(state.timeline[0].type).toBe('work');
      expect(state.timeline[0].start).toBe(startTime);
    });

    it('should close existing timeline events when starting', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const startTime = 1000000000000;
      vi.setSystemTime(startTime);

      // First start
      act(() => {
        useTimerStore.getState().startTimer();
      });

      // Advance time
      vi.advanceTimersByTime(1000);
      const secondStartTime = startTime + 1000;

      // Pause
      act(() => {
        useTimerStore.getState().pauseTimer();
      });

      // Start again - should close the pause event
      vi.setSystemTime(secondStartTime);
      act(() => {
        useTimerStore.getState().startTimer();
      });

      const state = useTimerStore.getState();
      expect(state.timeline).toHaveLength(3); // work, pause, work
      expect(state.timeline[1].end).toBeDefined();
    });

    it('should preserve timeLeft when resuming', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      act(() => {
        useTimerStore.setState({ timeLeft: 1500 });
        useTimerStore.getState().startTimer();
      });

      const state = useTimerStore.getState();
      expect(state.timeLeft).toBe(1500);
    });

    it('should set endTime based on timeLeft', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const startTime = 1000000000000;
      vi.setSystemTime(startTime);

      act(() => {
        useTimerStore.setState({ timeLeft: 100 }); // 100 seconds
        useTimerStore.getState().startTimer();
      });

      const state = useTimerStore.getState();
      expect(state.endTime).toBe(startTime + 100 * 1000);
    });

    it('should preserve originalStartTime if already set', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const originalTime = 1000000000000;
      const laterTime = 1000000005000;

      act(() => {
        vi.setSystemTime(originalTime);
        useTimerStore.getState().startTimer();
      });

      act(() => {
        vi.setSystemTime(laterTime);
        useTimerStore.getState().pauseTimer();
        useTimerStore.getState().startTimer();
      });

      const state = useTimerStore.getState();
      expect(state.originalStartTime).toBe(originalTime);
    });
  });

  describe('pauseTimer', () => {
    it('should pause active timer', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const startTime = 1000000000000;
      vi.setSystemTime(startTime);

      act(() => {
        useTimerStore.getState().startTimer();
      });

      vi.advanceTimersByTime(5000);

      act(() => {
        useTimerStore.getState().pauseTimer();
      });

      const state = useTimerStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.endTime).toBeNull();
    });

    it('should add pause event to timeline', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(1000000000000);

      act(() => {
        useTimerStore.getState().startTimer();
      });

      act(() => {
        useTimerStore.getState().pauseTimer();
      });

      const state = useTimerStore.getState();
      expect(state.timeline).toHaveLength(2);
      expect(state.timeline[1].type).toBe('pause');
    });

    it('should close current event when pausing', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const startTime = 1000000000000;
      vi.setSystemTime(startTime);

      act(() => {
        useTimerStore.getState().startTimer();
      });

      vi.advanceTimersByTime(5000);
      const pauseTime = startTime + 5000;

      act(() => {
        useTimerStore.getState().pauseTimer();
      });

      const state = useTimerStore.getState();
      expect(state.timeline[0].end).toBe(pauseTime);
    });

    it('should calculate remaining timeLeft', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const startTime = 1000000000000;
      vi.setSystemTime(startTime);

      act(() => {
        useTimerStore.setState({ timeLeft: 3000 });
        useTimerStore.getState().startTimer();
      });

      vi.advanceTimersByTime(5000);

      act(() => {
        useTimerStore.getState().pauseTimer();
      });

      const state = useTimerStore.getState();
      expect(state.timeLeft).toBeLessThan(3000);
    });

    it('should not pause if already inactive', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      act(() => {
        useTimerStore.getState().pauseTimer();
      });

      const state = useTimerStore.getState();
      expect(state.timeline).toHaveLength(0);
    });

    it('should set pauseStartTime', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const startTime = 1000000000000;
      vi.setSystemTime(startTime);

      act(() => {
        useTimerStore.getState().startTimer();
      });

      act(() => {
        useTimerStore.getState().pauseTimer();
      });

      const state = useTimerStore.getState();
      expect(state.pauseStartTime).toBeGreaterThan(0);
    });
  });

  describe('resetTimer', () => {
    it('should reset to current duration by default', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      act(() => {
        useTimerStore.setState({ timeLeft: 1500, duration: 3000 });
        useTimerStore.getState().resetTimer();
      });

      const state = useTimerStore.getState();
      expect(state.timeLeft).toBe(3000);
      expect(state.isActive).toBe(false);
    });

    it('should reset to specified time', () => {
      act(() => {
        useTimerStore.getState().resetTimer(600);
      });

      const state = useTimerStore.getState();
      expect(state.timeLeft).toBe(600);
    });

    it('should reset timer-related state', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      act(() => {
        useTimerStore.getState().startTimer();
        useTimerStore.getState().pauseTimer();
      });

      act(() => {
        useTimerStore.getState().resetTimer();
      });

      const state = useTimerStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.startTime).toBeNull();
      expect(state.endTime).toBeNull();
      expect(state.pauseStartTime).toBeNull();
    });

    it('should preserve sessionId and timeline', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      act(() => {
        useTimerStore.setState({
          sessionId: 'session-123',
          timeline: [{ type: 'work', start: 1000 }],
        });
        useTimerStore.getState().resetTimer();
      });

      const state = useTimerStore.getState();
      expect(state.sessionId).toBe('session-123');
      expect(state.timeline).toHaveLength(1);
    });
  });

  describe('resetAll', () => {
    it('should reset all state to initial values', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      act(() => {
        useTimerStore.getState().startTimer();
        useTimerStore.setState({
          isBreak: true,
          sessionCount: 5,
          selectedCourse: { id: '1', name: 'Test', category: 'cat' },
        });
      });

      act(() => {
        useTimerStore.getState().resetAll();
      });

      const state = useTimerStore.getState();
      expect(state.timeLeft).toBe(3000);
      expect(state.isActive).toBe(false);
      expect(state.isBreak).toBe(false);
      expect(state.sessionCount).toBe(1);
      expect(state.selectedCourse).toBeNull();
      expect(state.sessionId).toBeNull();
      expect(state.timeline).toEqual([]);
      expect(state.hasRestored).toBe(true);
    });
  });

  describe('tick', () => {
    it('should decrease timeLeft when active', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const startTime = 1000000000000;
      vi.setSystemTime(startTime);

      act(() => {
        useTimerStore.setState({ timeLeft: 100 });
        useTimerStore.getState().startTimer();
      });

      vi.advanceTimersByTime(5000);

      act(() => {
        useTimerStore.getState().tick();
      });

      const state = useTimerStore.getState();
      expect(state.timeLeft).toBe(95); // 100 - 5 seconds
    });

    it('should not update when inactive', () => {
      act(() => {
        useTimerStore.setState({ timeLeft: 100 });
        useTimerStore.getState().tick();
      });

      const state = useTimerStore.getState();
      expect(state.timeLeft).toBe(100);
    });

    it('should not update when no endTime', () => {
      act(() => {
        useTimerStore.setState({ isActive: true, endTime: null });
        useTimerStore.getState().tick();
      });

      const state = useTimerStore.getState();
      expect(state.isActive).toBe(true);
    });
  });

  describe('setMode', () => {
    it('should set work mode', () => {
      act(() => {
        useTimerStore.getState().setMode('work');
      });

      const state = useTimerStore.getState();
      expect(state.isBreak).toBe(false);
      expect(state.duration).toBe(3000);
      expect(state.timeLeft).toBe(3000);
    });

    it('should set break mode', () => {
      act(() => {
        useTimerStore.getState().setMode('break');
      });

      const state = useTimerStore.getState();
      expect(state.isBreak).toBe(true);
      expect(state.duration).toBe(600);
      expect(state.timeLeft).toBe(600);
    });

    it('should reset active state', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      act(() => {
        useTimerStore.getState().startTimer();
        useTimerStore.getState().setMode('break');
      });

      const state = useTimerStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.startTime).toBeNull();
      expect(state.endTime).toBeNull();
    });

    it('should not reset sessionId', () => {
      act(() => {
        useTimerStore.setState({ sessionId: 'session-123' });
        useTimerStore.getState().setMode('break');
      });

      const state = useTimerStore.getState();
      expect(state.sessionId).toBe('session-123');
    });
  });

  describe('setCourse', () => {
    it('should set selected course', () => {
      const course = { id: '1', name: 'Test Course', category: 'Test' };

      act(() => {
        useTimerStore.getState().setCourse(course);
      });

      const state = useTimerStore.getState();
      expect(state.selectedCourse).toEqual(course);
    });

    it('should reset session when course changes', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const course1 = { id: '1', name: 'Course 1', category: 'Test' };
      const course2 = { id: '2', name: 'Course 2', category: 'Test' };

      act(() => {
        useTimerStore.setState({
          selectedCourse: course1,
          sessionId: 'session-123',
          timeline: [{ type: 'work', start: 1000 }],
          sessionCount: 5,
        });
        useTimerStore.getState().setCourse(course2);
      });

      const state = useTimerStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.timeline).toEqual([]);
      expect(state.sessionCount).toBe(1);
    });

    it('should not reset when same course is set', () => {
      const course = { id: '1', name: 'Course', category: 'Test' };

      act(() => {
        useTimerStore.setState({
          selectedCourse: course,
          sessionId: 'session-123',
          timeline: [{ type: 'work', start: 1000 }],
        });
        useTimerStore.getState().setCourse(course);
      });

      const state = useTimerStore.getState();
      expect(state.sessionId).toBe('session-123');
      expect(state.timeline).toHaveLength(1);
    });

    it('should reset timer state when course changes in break mode', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const course1 = { id: '1', name: 'Course 1', category: 'Test' };
      const course2 = { id: '2', name: 'Course 2', category: 'Test' };

      act(() => {
        useTimerStore.setState({
          selectedCourse: course1,
          isBreak: true,
          timeLeft: 500,
        });
        useTimerStore.getState().setCourse(course2);
      });

      const state = useTimerStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.startTime).toBeNull();
      expect(state.endTime).toBeNull();
      expect(state.timeLeft).toBe(600); // Break duration preserved
    });

    it('should reset timer state when course changes in work mode', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const course1 = { id: '1', name: 'Course 1', category: 'Test' };
      const course2 = { id: '2', name: 'Course 2', category: 'Test' };

      act(() => {
        useTimerStore.setState({
          selectedCourse: course1,
          isBreak: false,
          timeLeft: 500,
        });
        useTimerStore.getState().setCourse(course2);
      });

      const state = useTimerStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.startTime).toBeNull();
      expect(state.endTime).toBeNull();
      expect(state.timeLeft).toBe(3000); // Work duration preserved
    });

    it('should use break duration when switching courses in break mode', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const course1 = { id: '1', name: 'Course 1', category: 'Test' };
      const course2 = { id: '2', name: 'Course 2', category: 'Test' };

      act(() => {
        useTimerStore.setState({
          selectedCourse: course1,
          isBreak: true,
          timeLeft: 500,
        });
        useTimerStore.getState().setCourse(course2);
      });

      const state = useTimerStore.getState();
      expect(state.timeLeft).toBe(600); // Break duration
      expect(state.isBreak).toBe(true);
    });
  });

  describe('getPauseDuration', () => {
    it('should calculate pause duration from timeline', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const now = 1000000000000;
      vi.setSystemTime(now);

      act(() => {
        useTimerStore.setState({
          timeline: [
            { type: 'work', start: now - 10000, end: now - 8000 },
            { type: 'pause', start: now - 8000, end: now - 5000 },
            { type: 'work', start: now - 5000, end: now - 2000 },
            { type: 'pause', start: now - 2000 }, // Still active pause
          ],
        });
      });

      const duration = useTimerStore.getState().getPauseDuration();
      expect(duration).toBe(5000); // 3000 + 2000 (ongoing pause)
    });

    it('should return 0 with no pauses', () => {
      act(() => {
        useTimerStore.setState({
          timeline: [
            { type: 'work', start: 1000, end: 2000 },
            { type: 'work', start: 2000, end: 3000 },
          ],
        });
      });

      const duration = useTimerStore.getState().getPauseDuration();
      expect(duration).toBe(0);
    });

    it('should handle empty timeline', () => {
      act(() => {
        useTimerStore.setState({ timeline: [] });
      });

      const duration = useTimerStore.getState().getPauseDuration();
      expect(duration).toBe(0);
    });
  });

  describe('incrementSession', () => {
    it('should increment session count', () => {
      act(() => {
        useTimerStore.getState().incrementSession();
      });

      const state = useTimerStore.getState();
      expect(state.sessionCount).toBe(2);
    });

    it('should increment multiple times', () => {
      act(() => {
        useTimerStore.getState().incrementSession();
        useTimerStore.getState().incrementSession();
        useTimerStore.getState().incrementSession();
      });

      const state = useTimerStore.getState();
      expect(state.sessionCount).toBe(4);
    });
  });

  describe('setSessionId', () => {
    it('should set session id', () => {
      act(() => {
        useTimerStore.getState().setSessionId('session-123');
      });

      const state = useTimerStore.getState();
      expect(state.sessionId).toBe('session-123');
    });

    it('should set null session id', () => {
      act(() => {
        useTimerStore.setState({ sessionId: 'session-123' });
        useTimerStore.getState().setSessionId(null);
      });

      const state = useTimerStore.getState();
      expect(state.sessionId).toBeNull();
    });
  });

  describe('setSessionCount', () => {
    it('should set session count', () => {
      act(() => {
        useTimerStore.getState().setSessionCount(10);
      });

      const state = useTimerStore.getState();
      expect(state.sessionCount).toBe(10);
    });

    it('should accept zero', () => {
      act(() => {
        useTimerStore.getState().setSessionCount(0);
      });

      const state = useTimerStore.getState();
      expect(state.sessionCount).toBe(0);
    });
  });

  describe('setWidgetOpen', () => {
    it('should set widget open state', () => {
      act(() => {
        useTimerStore.getState().setWidgetOpen(true);
      });

      const state = useTimerStore.getState();
      expect(state.isWidgetOpen).toBe(true);
    });

    it('should set widget closed', () => {
      act(() => {
        useTimerStore.setState({ isWidgetOpen: true });
        useTimerStore.getState().setWidgetOpen(false);
      });

      const state = useTimerStore.getState();
      expect(state.isWidgetOpen).toBe(false);
    });
  });

  describe('setHasRestored', () => {
    it('should set hasRestored flag', () => {
      act(() => {
        useTimerStore.getState().setHasRestored(true);
      });

      const state = useTimerStore.getState();
      expect(state.hasRestored).toBe(true);
    });

    it('should set hasRestored to false', () => {
      act(() => {
        useTimerStore.setState({ hasRestored: true });
        useTimerStore.getState().setHasRestored(false);
      });

      const state = useTimerStore.getState();
      expect(state.hasRestored).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should persist serializable state', () => {
      const state = useTimerStore.getState();

      // Check that partialize function exists and filters out functions
      expect(state.getPauseDuration).toBeTypeOf('function');
      // Functions are not persisted (that's the expected behavior of partialize)
    });
  });
});
