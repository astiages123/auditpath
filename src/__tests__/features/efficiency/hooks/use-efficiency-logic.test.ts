import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  type EfficiencyMetrics,
  useEfficiencyLogic,
} from '@/features/efficiency/hooks/use-efficiency-logic';

describe('useEfficiencyLogic', () => {
  const defaultMetrics: EfficiencyMetrics = {
    totalVideoTime: 100,
    totalPomodoroTime: 100,
  };

  describe('Safety Guard', () => {
    it('should return 0 learningFlow and "stuck" state when totalPomodoroTime is 0', () => {
      const { result } = renderHook(() =>
        useEfficiencyLogic({
          totalVideoTime: 100,
          totalPomodoroTime: 0,
        })
      );

      expect(result.current.learningFlow).toBe(0);
      expect(result.current.flowState).toBe('stuck');
    });
  });

  describe('Symmetric Flow States (Threshold Tests)', () => {
    const testCases: Array<{
      video: number;
      pomodoro: number;
      expectedState: string;
      expectedScore: number;
    }> = [
      {
        video: 10,
        pomodoro: 100,
        expectedState: 'stuck',
        expectedScore: 0.1,
      },
      {
        video: 50,
        pomodoro: 100,
        expectedState: 'deep',
        expectedScore: 0.5,
      },
      {
        video: 100,
        pomodoro: 100,
        expectedState: 'optimal',
        expectedScore: 1.0,
      },
      {
        video: 150,
        pomodoro: 100,
        expectedState: 'speed',
        expectedScore: 1.5,
      },
      {
        video: 200,
        pomodoro: 100,
        expectedState: 'shallow',
        expectedScore: 2.0,
      },
    ];

    testCases.forEach(({ video, pomodoro, expectedState, expectedScore }) => {
      it(`should return "${expectedState}" state for score ${expectedScore}`, () => {
        const { result } = renderHook(() =>
          useEfficiencyLogic({
            totalVideoTime: video,
            totalPomodoroTime: pomodoro,
          })
        );

        expect(result.current.learningFlow).toBe(expectedScore);
        expect(result.current.flowState).toBe(expectedState);
      });
    });
  });

  describe('Goal Progress', () => {
    it('should calculate 50% progress for 100 minutes (Goal: 200)', () => {
      const { result } = renderHook(() =>
        useEfficiencyLogic({
          ...defaultMetrics,
          totalPomodoroTime: 100,
        })
      );

      expect(result.current.goalProgress).toBe(50);
    });

    it('should calculate 100% progress for 200 minutes', () => {
      const { result } = renderHook(() =>
        useEfficiencyLogic({
          ...defaultMetrics,
          totalPomodoroTime: 200,
        })
      );

      expect(result.current.goalProgress).toBe(100);
    });

    it('should cap progress at 100% for 300 minutes', () => {
      const { result } = renderHook(() =>
        useEfficiencyLogic({
          ...defaultMetrics,
          totalPomodoroTime: 300,
        })
      );

      expect(result.current.goalProgress).toBe(100);
    });
  });

  describe('Time Formatting', () => {
    it('should format 0 minutes as "0sa 0dk"', () => {
      const { result } = renderHook(() =>
        useEfficiencyLogic({ ...defaultMetrics, totalPomodoroTime: 0 })
      );

      expect(result.current.formattedCurrentTime).toBe('0sa 0dk');
    });

    it('should format 75 minutes as "1sa 15dk"', () => {
      const { result } = renderHook(() =>
        useEfficiencyLogic({ ...defaultMetrics, totalPomodoroTime: 75 })
      );

      expect(result.current.formattedCurrentTime).toBe('1sa 15dk');
    });

    it('should format 120 minutes as "2sa 0dk"', () => {
      const { result } = renderHook(() =>
        useEfficiencyLogic({
          ...defaultMetrics,
          totalPomodoroTime: 120,
        })
      );

      expect(result.current.formattedCurrentTime).toBe('2sa 0dk');
    });
  });

  describe('Generic Values', () => {
    it('should return currentMinutes and goalMinutes', () => {
      const { result } = renderHook(() =>
        useEfficiencyLogic({
          ...defaultMetrics,
          totalPomodoroTime: 123,
        })
      );

      expect(result.current.currentMinutes).toBe(123);
      expect(result.current.goalMinutes).toBe(200);
    });

    it('should return isWarning true when state is not optimal', () => {
      const { result } = renderHook(
        () =>
          useEfficiencyLogic({
            totalVideoTime: 50,
            totalPomodoroTime: 100,
          }) // score 0.5 -> deep
      );

      expect(result.current.flowState).toBe('deep');
      expect(result.current.isWarning).toBe(true);
    });

    it('should return isWarning false when state is optimal', () => {
      const { result } = renderHook(
        () =>
          useEfficiencyLogic({
            totalVideoTime: 100,
            totalPomodoroTime: 100,
          }) // score 1.0 -> optimal
      );

      expect(result.current.flowState).toBe('optimal');
      expect(result.current.isWarning).toBe(false);
    });
  });
});
