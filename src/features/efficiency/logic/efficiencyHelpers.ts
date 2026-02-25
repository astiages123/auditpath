import { EFFICIENCY_THRESHOLDS } from '../utils/constants';
import { getVirtualDateKey } from '@/utils/dateUtils';
import { flowState } from '../types/efficiencyTypes';

/**
 * Generates an array of date strings for the last N days.
 * @param days - Number of days to look back
 * @returns Array of date strings (YYYY-MM-DD)
 */
export function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(getVirtualDateKey(d));
  }
  return dates;
}

export interface EfficiencyMetrics {
  totalVideoTime: number; // minutes
  totalPomodoroTime: number; // minutes
}

export interface LearningFlowResult {
  score: number;
  state: flowState;
}

/**
 * Calculates the raw efficiency score (Video / Pomodoro ratio).
 * @param videoMinutes - Total video watch time in minutes
 * @param workMinutes - Total pomodoro work time in minutes
 * @returns Score as a number (e.g. 1.25)
 */
export function calculateEfficiencyScore(
  videoMinutes: number,
  workMinutes: number
): number {
  if (workMinutes <= 0) return 0;
  const ratio = videoMinutes / workMinutes;
  return Number(ratio.toFixed(2));
}

/**
 * Calculates the learning flow score and state based on video and pomodoro time.
 * @param metrics - Object containing totalVideoTime and totalPomodoroTime in minutes
 * @returns Object containing score (number) and state (flowState)
 */
export function calculateLearningFlow(
  metrics: EfficiencyMetrics
): LearningFlowResult {
  const score = calculateEfficiencyScore(
    metrics.totalVideoTime,
    metrics.totalPomodoroTime
  );

  // Safety Guard: if no work done, flow is 0 (handled by calculateEfficiencyScore but check for state)
  if (metrics.totalPomodoroTime === 0) {
    return { score: 0, state: 'stuck' };
  }

  // 2. Determine State based on 1.0x centered symmetric spectrum
  let state: flowState;

  if (score < EFFICIENCY_THRESHOLDS.STUCK) {
    state = 'stuck';
  } else if (score < EFFICIENCY_THRESHOLDS.DEEP) {
    state = 'deep';
  } else if (score <= EFFICIENCY_THRESHOLDS.OPTIMAL_MAX) {
    state = 'optimal';
  } else if (score <= EFFICIENCY_THRESHOLDS.SPEED) {
    state = 'speed';
  } else {
    state = 'shallow';
  }

  return { score, state };
}

/**
 * Calculates the progress percentage towards the daily goal.
 * @param currentMinutes - Total minutes worked today
 * @param goalMinutes - Daily goal in minutes
 * @returns Progress percentage (0-100)
 */
export function calculateGoalProgress(
  currentMinutes: number,
  goalMinutes: number
): number {
  if (goalMinutes <= 0) return 0;
  return Math.min(Math.round((currentMinutes / goalMinutes) * 100), 100);
}

/**
 * Formats minutes into a readable string (e.g., "3sa 15dk").
 * @param minutes - Total minutes
 * @returns Formatted time string
 */
export function formatEfficiencyTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}sa ${m}dk`;
}
