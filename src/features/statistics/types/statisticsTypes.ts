import { z } from 'zod';

import {
  DetailedSession,
  PauseIntervalSchema,
  RecentSession,
  TimelineEventSchema,
} from '@/features/pomodoro/types/pomodoroTypes';
import { BloomStats } from '@/features/quiz/types';

// ==========================================
// === RE-EXPORTS ===
// ==========================================

export type { BloomStats, DetailedSession, RecentSession };
export { PauseIntervalSchema, TimelineEventSchema };

// ==========================================
// === ENUMS & LITERALS ===
// ==========================================

/** Flow state literal representing the user's learning state */
export type FlowState = 'stuck' | 'deep' | 'optimal' | 'speed' | 'shallow';

// ==========================================
// === BASIC DATA INTERFACES ===
// ==========================================

/** Daily statistics for efficiency metrics */
export interface DailyStats {
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  sessionCount: number;
  goalMinutes: number;
  progress: number;
  goalPercentage: number;
  trendPercentage: number;
  dailyGoal: number;
  totalPauseMinutes: number;
  totalVideoMinutes: number;
  totalReadingMinutes: number;
  pagesRead: number;
  completedVideos: number;
  videoTrendPercentage: number;
  totalCycles: number;
}

/** Represents a single day's activity level and intensity */
export interface DayActivity {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  intensity: number;
  totalMinutes: number;
}

/** General efficiency data over a period */
export interface EfficiencyData {
  efficiencyScore: number;
  trend: 'up' | 'down' | 'stable';
  isAlarm: boolean;
  videoMinutes: number;
  pomodoroMinutes: number;
  quizMinutes: number;
}

/** Milestones for total videos watched */
export interface DailyVideoMilestones {
  maxCount: number;
  first5Date: string | null;
  first10Date: string | null;
}

/** Cumulative totals across all time */
export interface CumulativeStats {
  totalWorkMinutes: number;
  totalVideoMinutes: number;
  ratio: number;
}

/** Pomodoro and video statistics for a specific historical date */
export interface HistoryStats {
  date: string;
  pomodoro: number;
  video: number;
}

/** Trend data for focus time */
export interface FocusTrend {
  date: string;
  minutes: number;
}

/** Trend data for efficiency score */
export interface EfficiencyTrend {
  date: string;
  score: number;
  workMinutes: number;
  videoMinutes: number;
}

/** Summary of a single day's efficiency */
export interface DailyEfficiencySummary {
  efficiencyScore: number;
  totalCycles: number;
  netWorkTimeSeconds: number;
  totalBreakTimeSeconds: number;
  totalPauseTimeSeconds: number;
  pauseCount: number;
  sessions: DetailedSession[];
}

/** Basic session representing a single work block */
export interface Session {
  id: string;
  lessonName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  timeline?: Array<{
    type: string;
    start: number;
    end: number;
    duration?: number;
  }>;
  pauseIntervals: Array<{ start: string; end: string }>;
}

/** Load and distribution of learning activities */
export interface LearningLoad {
  day: string;
  videoMinutes: number;
  readingMinutes?: number;
  extraStudyMinutes: number;
  rawDate?: Date;
}

/** Data point for focus power calculation */
export interface FocusPowerPoint {
  date: string;
  originalDate: string;
  score: number;
  workMinutes: number;
  breakMinutes: number;
  pauseMinutes: number;
}

/** Props for EfficiencyTrend component */
export interface EfficiencyTrendProps {
  data: EfficiencyTrend[];
}

/** Props for FocusPowerTrend component */
export interface FocusPowerTrendProps {
  data: FocusPowerPoint[];
  rangeLabel?: 'week' | 'month' | 'all';
}

// ==========================================
// === COMPOSITE INTERFACES ===
// ==========================================

/** Data specifically formatted for dashboard card displays */
export interface CardEfficiencyData {
  loading: boolean;
  currentWorkMinutes: number;
  todayVideoMinutes: number;
  todayVideoCount: number;
  videoTrendPercentage: number;
  sessions: Session[];
  dailyGoalMinutes: number;
  efficiencyTrend: EfficiencyTrend[];
  trendPercentage: number;
  learningFlow: number;
  flowState: string;
  goalProgress: number;
  loadWeek: LearningLoad[];
  loadDay: LearningLoad[];
  loadMonth: LearningLoad[];
  loadAll: LearningLoad[];
  bloomStats: BloomStats[];
  lessonMastery: Array<{
    lessonId: string;
    title: string;
    mastery: number;
    videoProgress: number;
    questionProgress: number;
  }>;
  consistencyData: DayActivity[];
  recentSessions: RecentSession[];
  focusPowerWeek: FocusPowerPoint[];
  focusPowerMonth: FocusPowerPoint[];
  focusPowerAll: FocusPowerPoint[];
}

// ==========================================
// === ZOD SCHEMAS ===
// ==========================================

/** Schema validation for a regular session */
export const SessionSchema = z.object({
  id: z.string(),
  lessonName: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  duration: z.number(),
  timeline: z.array(TimelineEventSchema).optional(),
  pauseIntervals: z.array(PauseIntervalSchema),
});

/** Schema validation for a recent session */
export const RecentSessionSchema = z.object({
  id: z.string(),
  courseName: z.string(),
  date: z.string(),
  durationMinutes: z.number(),
  efficiencyScore: z.number(),
  timeline: z.array(TimelineEventSchema),
  totalWorkTime: z.number(),
  totalBreakTime: z.number(),
  totalPauseTime: z.number(),
  pauseCount: z.number(),
});
