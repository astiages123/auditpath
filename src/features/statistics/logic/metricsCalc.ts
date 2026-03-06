import { SessionTotals } from '@/features/pomodoro/logic/sessionMath';

/**
 * Calculates the Focus Power score.
 * Formula: (Work / [Break + Pause]) * 20
 * Minimum effective interruption is considered 60 seconds to prevent division by zero or inflated scores.
 *
 * @param workSeconds - Total work time in seconds
 * @param breakSeconds - Total break time in seconds
 * @param pauseSeconds - Total pause time in seconds
 * @returns Focus power score calculated based on the session parameters
 *
 * @throws {Error} Throws if negative values are provided for time seconds
 *
 * @example
 * // returns 33
 * calculateFocusPower(100, 30, 30)
 */
export function calculateFocusPower(
  workSeconds: number,
  breakSeconds: number,
  pauseSeconds: number
): number {
  if (workSeconds <= 0) return 0;

  const totalInterruptionSeconds = breakSeconds + pauseSeconds;
  const effectiveInterruptionSeconds = Math.max(60, totalInterruptionSeconds);
  const focusScore = (workSeconds / effectiveInterruptionSeconds) * 20;

  return Math.max(0, Math.round(focusScore));
}

/**
 * Calculates the Focus Score based on the ratio of Work Time to Total Session Time (Work + Break).
 * Formula: (Work / (Work + Break)) * 100
 *
 * @param totals - Object containing totalWork and totalBreak in SECONDS
 * @returns Focus score as a percentage (0-100)
 *
 * @throws {Error} Throws if negative values are provided in the totals object
 *
 * @example
 * // returns 80
 * calculateFocusScore({ totalWork: 4000, totalBreak: 1000, pauseCount: 0, totalPause: 0 })
 */
export function calculateFocusScore(totals: SessionTotals): number {
  const totalDuration = totals.totalWork + totals.totalBreak;

  if (totalDuration <= 0) return 0;

  const percentageScore = (totals.totalWork / totalDuration) * 100;

  return Math.max(0, Math.min(100, Math.round(percentageScore)));
}
