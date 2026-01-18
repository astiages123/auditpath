
import { describe, it, expect } from 'vitest';
import { calculateSessionTotals, TimelineEvent } from './pomodoro-utils';

describe('calculateSessionTotals', () => {
  it('should return 0 for empty or invalid timeline', () => {
    expect(calculateSessionTotals([])).toEqual({ totalWork: 0, totalBreak: 0, totalPause: 0 });
    expect(calculateSessionTotals(null)).toEqual({ totalWork: 0, totalBreak: 0, totalPause: 0 });
  });

  it('should calculate completed work session correctly', () => {
    const start = 1000000;
    const end = start + 25 * 60 * 1000; // 25 mins
    const timeline: TimelineEvent[] = [
      { type: 'work', start, end }
    ];

    expect(calculateSessionTotals(timeline)).toEqual({
      totalWork: 25,
      totalBreak: 0,
      totalPause: 0
    });
  });

  it('should calculate mixed sessions correctly', () => {
    const t0 = 1000000;
    // Work: 20 mins
    const t1 = t0 + 20 * 60 * 1000;
    // Pause: 5 mins
    const t2 = t1 + 5 * 60 * 1000;
    // Work: 5 mins
    const t3 = t2 + 5 * 60 * 1000;
    // Break: 10 mins
    const t4 = t3 + 10 * 60 * 1000;

    const timeline: TimelineEvent[] = [
      { type: 'work', start: t0, end: t1 },
      { type: 'pause', start: t1, end: t2 },
      { type: 'work', start: t2, end: t3 }, // Resume work
      { type: 'break', start: t3, end: t4 }
    ];

    expect(calculateSessionTotals(timeline)).toEqual({
      totalWork: 25, // 20 + 5
      totalBreak: 10,
      totalPause: 5
    });
  });

  it('should handle ongoing sessions using "now"', () => {
    const now = 2000000;
    const start = now - 10 * 60 * 1000; // Started 10 mins ago

    const timeline: TimelineEvent[] = [
      { type: 'work', start } // No end time
    ];

    // Pass 'now' explicitly to control the test
    expect(calculateSessionTotals(timeline, now)).toEqual({
      totalWork: 10,
      totalBreak: 0,
      totalPause: 0
    });
  });

  it('should round correctly', () => {
    const start = 0;
    const timeline: TimelineEvent[] = [
      { type: 'work', start, end: 35 * 1000 } // 35 seconds = 0.58 mins -> round to 1
    ];
    
    // 30 seconds -> 0.5 minutes -> Math.round(0.5) is 1
    expect(calculateSessionTotals(timeline)).toEqual({
        totalWork: 1, 
        totalBreak: 0, 
        totalPause: 0 
    });

    const timeline2: TimelineEvent[] = [
        { type: 'work', start, end: 29 * 1000 } // 29 seconds -> 0.48 mins -> 0
      ];
      expect(calculateSessionTotals(timeline2)).toEqual({
          totalWork: 0, 
          totalBreak: 0, 
          totalPause: 0 
      });
  });
});
