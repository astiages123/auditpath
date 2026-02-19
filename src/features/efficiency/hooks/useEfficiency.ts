import { DAILY_GOAL_MINUTES } from '../utils/constants';
import {
  calculateGoalProgress,
  calculateLearningFlow,
  formatEfficiencyTime,
} from '../logic/efficiencyHelpers';

export interface EfficiencyMetrics {
  totalVideoTime: number; // minutes
  totalPomodoroTime: number; // minutes
}

export function useEfficiencyLogic(todayMetrics: EfficiencyMetrics) {
  const learningFlowMetrics = calculateLearningFlow({
    totalVideoTime: todayMetrics.totalVideoTime,
    totalPomodoroTime: todayMetrics.totalPomodoroTime,
  });

  const learningFlow = learningFlowMetrics.score;
  const flowState = learningFlowMetrics.state;

  // Warning is now handled by flowState colors in UI, but we keep a boolean for backward compat if needed
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
