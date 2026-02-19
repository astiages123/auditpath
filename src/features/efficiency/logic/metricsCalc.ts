import { SessionTotals } from '@/features/pomodoro/logic/sessionMath';

export function calculateLearningFlow(
  workMinutes: number,
  videoMinutes: number
): number {
  if (workMinutes <= 0) return 0;

  const ratio = videoMinutes / workMinutes;
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
  const effectiveInterruptionSeconds = Math.max(60, totalInterruptionSeconds);

  const score = (workSeconds / effectiveInterruptionSeconds) * 20;

  return Math.round(score);
}

/**
 * Calculates the Focus Score based on the ratio of Work Time to Total Session Time (Work + Break).
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
