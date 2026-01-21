
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
export interface SessionTotals {
  totalWork: number;
  totalBreak: number;
  totalPause: number;
}

/**
 * Calculates the total duration for each activity type in seconds.
 * @param timeline - The array of timeline events
 * @param now - Optional current timestamp to use for ongoing events. Defaults to Date.now()
 * @returns Object containing total seconds for work, break, and pause.
 */
export function calculateSessionTotals(
  timeline: TimelineEvent[] | unknown, 
  now: number = Date.now()
): SessionTotals {
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

  // Return totals in SECONDS (rounded to nearest second)
  return {
    totalWork: Math.round(workMs / 1000),
    totalBreak: Math.round(breakMs / 1000),
    totalPause: Math.round(pauseMs / 1000),
  };
}
