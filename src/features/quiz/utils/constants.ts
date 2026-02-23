// Quiz limits and mastery thresholds
export const DAILY_QUOTA = 50;
export const MASTERY_THRESHOLD = 80;
export const MAX_LOG_ENTRIES = 50;

export const QUIZ_CONFIG = {
  DEFAULT_QUOTAS: { antrenman: 5, arsiv: 1, deneme: 1 },
  SESSION_GAPS: [1, 3, 7, 14, 30],
  MASTERY_THRESHOLDS: { EXCELLENT: 80, GOOD: 50 },
  DAILY_LIMIT: 50,
  QUESTIONS_PER_CONCEPT: 3,
} as const;
