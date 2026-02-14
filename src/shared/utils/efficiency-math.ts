/**
 * Shared mathematical functions for efficiency and pomodoro calculations.
 */

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
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return { totalWork: 0, totalBreak: 0, totalPause: 0 };
  }

  // Sort timeline by start time to ensure sequential processing
  const sortedTimeline = [...(timeline as TimelineEvent[])]
    .filter((e) => e && e.start !== undefined && e.start !== null)
    .sort((a, b) => a.start - b.start);

  let workMs = 0;
  let breakMs = 0;
  let pauseMs = 0;

  for (let i = 0; i < sortedTimeline.length; i++) {
    const event = sortedTimeline[i];
    const nextEvent = sortedTimeline[i + 1];

    // The effective end of an event is:
    // 1. Its own end time (if provided)
    // 2. BUT it cannot exceed the start of the NEXT event (precedence/overlap prevention)
    // 3. IF no end time and no next event, use 'now'

    let endTime = event.end || now;

    // If there is a next event, this event MUST end when the next one starts
    // to prevent double counting if they overlap.
    if (nextEvent && nextEvent.start < endTime) {
      endTime = nextEvent.start;
    }

    // Ensure duration isn't negative
    const duration = Math.max(0, endTime - event.start);

    const eventType = (event.type || 'work').toLowerCase();
    switch (eventType) {
      case 'work':
      case 'çalışma':
      case 'odak':
        workMs += duration;
        break;
      case 'break':
      case 'mola':
        breakMs += duration;
        break;
      case 'pause':
      case 'duraklatma':
      case 'duraklama':
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

/**
 * Counts the number of pause events in the timeline.
 * @param timeline - The array of timeline events
 * @returns The count of pause events
 */
export function calculatePauseCount(
  timeline: TimelineEvent[] | unknown
): number {
  if (!Array.isArray(timeline)) {
    return 0;
  }

  return timeline.filter((event) => {
    const eventType = (event.type || '').toLowerCase();
    return (
      eventType === 'pause' ||
      eventType === 'duraklatma' ||
      eventType === 'duraklama'
    );
  }).length;
}

export function calculateLearningFlow(
  workMinutes: number,
  videoMinutes: number
): number {
  if (workMinutes <= 0) return 0; // No work done = 0 flow

  const ratio = videoMinutes / workMinutes;

  // Return raw multiplier with 2 decimals precision
  return Number(ratio.toFixed(2));
}

/**
 * Calculates the Focus Power score based on the formula: (Work / [Break + Pause]) * 20
 *
 * @param workSeconds - Total work time in seconds
 * @param breakSeconds - Total break time in seconds
 * @param pauseSeconds - Total pause time in seconds
 * @returns Focus power score
 */
export function calculateFocusPower(
  workSeconds: number,
  breakSeconds: number,
  pauseSeconds: number
): number {
  if (workSeconds <= 0) return 0;

  const totalInterruptionSeconds = breakSeconds + pauseSeconds;
  // Use minimum 60 seconds (1 minute) for interruption to avoid division by zero
  // and match the minute-based logic used elsewhere
  const effectiveInterruptionSeconds = Math.max(60, totalInterruptionSeconds);

  // Formula: (WorkMinutes / InterruptionMinutes) * 20
  // Which is equivalent to (WorkSeconds / InterruptionSeconds) * 20
  const score = (workSeconds / effectiveInterruptionSeconds) * 20;

  return Math.round(score);
}

/**
 * Calculates the Focus Score based on the ratio of Work Time to Total Session Time (Work + Break).
 * This is a classic percentage-based efficiency score.
 * Formula: (Work / (Work + Break)) * 100
 *
 * @param totals - Object containing totalWork and totalBreak in SECONDS
 * @returns Focus score (0-100)
 */
export function calculateFocusScore(totals: SessionTotals): number {
  const totalDuration = totals.totalWork + totals.totalBreak;

  if (totalDuration <= 0) return 0;

  const score = (totals.totalWork / totalDuration) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculates the number of 'work' cycles in a session based on the timeline.
 * @param timeline - The array of timeline events
 * @returns The number of work cycles
 */
export function getCycleCount(timeline: TimelineEvent[] | unknown): number {
  if (!Array.isArray(timeline)) {
    return 0;
  }

  let count = 0;
  let inWorkBlock = false;

  // Sort by start time just in case
  const sortedTimeline = [...(timeline as TimelineEvent[])]
    .filter((e) => e && e.start !== undefined && e.start !== null)
    .sort((a, b) => a.start - b.start);

  for (const event of sortedTimeline) {
    const type = (event.type || '').toLowerCase();
    const isWork = type === 'work' || type === 'çalışma' || type === 'odak';
    const isBreak = type === 'break' || type === 'mola';

    if (isWork && !inWorkBlock) {
      count++;
      inWorkBlock = true;
    } else if (isBreak) {
      inWorkBlock = false;
    }
    // Pause events do not change inWorkBlock status,
    // so resuming from pause won't increment the cycle count.
  }

  return count;
}

/**
 * Efficiency thresholds for learning flow analysis.
 * Symmetric around 1.0x (Optimal)
 */
export const EFFICIENCY_THRESHOLDS = {
  STUCK: 0.25, // < 0.25: Critical Slow (Rose)
  DEEP: 0.75, // 0.25 - 0.75: Warning Slow (Amber)
  OPTIMAL_MIN: 0.75, // 0.75 - 1.25: Ideal (Emerald)
  OPTIMAL_MAX: 1.25,
  SPEED: 1.75, // 1.25 - 1.75: Warning Fast (Amber)
  SHALLOW: 1.75, // > 1.75: Critical Fast (Rose)
};
