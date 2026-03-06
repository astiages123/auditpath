import { getVirtualDateKey } from '@/utils/dateUtils';

import { EFFICIENCY_THRESHOLDS } from '../utils/constants';
import { FlowState } from '../types';

/** Metrics for calculating learning flow */
export interface EfficiencyMetrics {
  totalVideoTime: number;
  totalReadingTime?: number;
  totalPomodoroTime: number;
}

/** Result of learning flow calculation */
export interface LearningFlowResult {
  score: number;
  state: FlowState;
}

/**
 * Generates an array of date strings for the last N days.
 *
 * @param days - Number of days to look back
 * @returns Array of date strings (YYYY-MM-DD)
 */
export function generateDateRange(days: number): string[] {
  const dates: string[] = [];

  for (let dayIndex = 0; dayIndex < days; dayIndex++) {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - dayIndex);
    dates.push(getVirtualDateKey(currentDate));
  }

  return dates;
}

/**
 * Formats minutes into a readable string (e.g., "3sa 15dk").
 *
 * @param totalMinutes - Total minutes
 * @returns Formatted time string
 */
export function formatEfficiencyTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}sa ${minutes}dk`;
}

/**
 * Calculates the raw efficiency score (Video / Pomodoro ratio).
 *
 * @param videoMinutes - Total video watch time in minutes
 * @param workMinutes - Total pomodoro work time in minutes
 * @returns Score as a number (e.g. 1.25)
 */
export function calculateEfficiencyScore(
  videoMinutes: number,
  workMinutes: number
): number {
  if (workMinutes <= 0) {
    return 0;
  }

  const ratio = videoMinutes / workMinutes;
  return Number(ratio.toFixed(2));
}

/**
 * Calculates the learning flow score and state based on video and pomodoro time.
 *
 * @param metrics - Object containing totalVideoTime and totalPomodoroTime in minutes
 * @returns Object containing score (number) and state (FlowState)
 */
export function calculateLearningFlow(
  metrics: EfficiencyMetrics
): LearningFlowResult {
  const totalContentTime =
    metrics.totalVideoTime + (metrics.totalReadingTime || 0);
  const score = calculateEfficiencyScore(
    totalContentTime,
    metrics.totalPomodoroTime
  );

  if (metrics.totalPomodoroTime === 0) {
    return { score: 0, state: 'stuck' };
  }

  if (score < EFFICIENCY_THRESHOLDS.STUCK) {
    return { score, state: 'stuck' };
  }

  if (score < EFFICIENCY_THRESHOLDS.DEEP) {
    return { score, state: 'deep' };
  }

  if (score <= EFFICIENCY_THRESHOLDS.OPTIMAL_MAX) {
    return { score, state: 'optimal' };
  }

  if (score <= EFFICIENCY_THRESHOLDS.SPEED) {
    return { score, state: 'speed' };
  }

  return { score, state: 'shallow' };
}

/**
 * Calculates the progress percentage towards the daily goal.
 *
 * @param currentMinutes - Total minutes worked today
 * @param goalMinutes - Daily goal in minutes
 * @returns Progress percentage (0-100)
 */
export function calculateGoalProgress(
  currentMinutes: number,
  goalMinutes: number
): number {
  if (goalMinutes <= 0) {
    return 0;
  }

  return Math.min(Math.round((currentMinutes / goalMinutes) * 100), 100);
}
