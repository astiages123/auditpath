export const DAILY_GOAL_MINUTES = 200;

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
