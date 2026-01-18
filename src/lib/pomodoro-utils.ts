
/**
 * Represents a single event in the Pomodoro timeline.
 */
export interface TimelineEvent {
  type: 'work' | 'break' | 'pause';
  start: number;
  end?: number;
}

/**
 * Calculates the total duration for each activity type in minutes.
 * @param timeline - The array of timeline events
 * @param now - Optional current timestamp to use for ongoing events. Defaults to Date.now()
 * @returns Object containing total minutes for work, break, and pause.
 */
export function calculateSessionTotals(
  timeline: TimelineEvent[] | unknown, 
  now: number = Date.now()
): { totalWork: number; totalBreak: number; totalPause: number } {
  if (!Array.isArray(timeline)) {
    return { totalWork: 0, totalBreak: 0, totalPause: 0 };
  }

  let workMs = 0;
  let breakMs = 0;
  let pauseMs = 0;

  for (const event of timeline as TimelineEvent[]) {
    // Skip invalid events
    if (event.start === undefined || event.start === null) continue;

    const endTime = event.end || now;
    // Prevent negative duration if system time changes or logic is weird
    const duration = Math.max(0, endTime - event.start);

    switch (event.type) {
      case 'work':
        workMs += duration;
        break;
      case 'break':
        breakMs += duration;
        break;
      case 'pause':
        pauseMs += duration;
        break;
    }
  }

  // Convert to minutes, rounding down (or nearest? usually minutes are floor or round)
  // Let's use Math.floor to be conservative, or Math.round? 
  // Standard practice for 'billed' time is often minutes. 
  // But for stats, maybe 1.9 minutes should be 2? 
  // Let's use Math.round to average out small errors.
  return {
    totalWork: Math.round(workMs / 1000 / 60),
    totalBreak: Math.round(breakMs / 1000 / 60),
    totalPause: Math.round(pauseMs / 1000 / 60),
  };
}
