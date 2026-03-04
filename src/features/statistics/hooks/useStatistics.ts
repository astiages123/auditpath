import { DAILY_GOAL_MINUTES } from '../utils/constants';
import {
  calculateGoalProgress,
  calculateLearningFlow,
  formatEfficiencyTime,
} from '../logic/statisticsHelpers';

import type { FlowState } from '../types/statisticsTypes';

// ==========================================
// === TYPES ===
// ==========================================

export interface EfficiencyMetrics {
  totalVideoTime: number; // in minutes
  totalReadingTime: number; // in minutes
  totalPomodoroTime: number; // in minutes
}

export interface EfficiencyLogicResult {
  learningFlow: number;
  flowState: FlowState;
  isWarning: boolean;
  goalProgress: number;
  goalMinutes: number;
  currentMinutes: number;
  formattedCurrentTime: string;
}

// ==========================================
// === HOOK ===
// ==========================================

/**
 * Encapsulates calculation of goal progress and learning flow scores
 * from aggregated daily activity metrics (video, reading, pomodoro times).
 *
 * @param {EfficiencyMetrics} todayMetrics Raw total times for today across categories
 * @returns {EfficiencyLogicResult} Formatted and processed goal logic results
 */
export function useStatisticsLogic(
  todayMetrics: EfficiencyMetrics
): EfficiencyLogicResult {
  const learningFlowMetrics = calculateLearningFlow({
    totalVideoTime: todayMetrics.totalVideoTime,
    totalReadingTime: todayMetrics.totalReadingTime,
    totalPomodoroTime: todayMetrics.totalPomodoroTime,
  });

  const learningFlow = learningFlowMetrics.score;
  const flowState = learningFlowMetrics.state;

  const isWarning = flowState !== 'optimal';

  const goalProgress = calculateGoalProgress(
    todayMetrics.totalPomodoroTime,
    DAILY_GOAL_MINUTES
  );

  return {
    learningFlow,
    flowState,
    isWarning,
    goalProgress,
    goalMinutes: DAILY_GOAL_MINUTES,
    currentMinutes: todayMetrics.totalPomodoroTime,
    formattedCurrentTime: formatEfficiencyTime(todayMetrics.totalPomodoroTime),
  };
}
