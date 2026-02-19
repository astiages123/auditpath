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

    let endTime = event.end || now;

    if (nextEvent && nextEvent.start < endTime) {
      endTime = nextEvent.start;
    }

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

  return timeline.filter((event: unknown) => {
    const evt = event as { type?: string };
    const eventType = (evt.type || '').toLowerCase();
    return (
      eventType === 'pause' ||
      eventType === 'duraklatma' ||
      eventType === 'duraklama'
    );
  }).length;
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
  }

  return count;
}
