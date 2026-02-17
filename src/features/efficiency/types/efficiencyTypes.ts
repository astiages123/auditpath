import { DetailedSession } from '@/features/pomodoro/types/pomodoroTypes';

export type { DetailedSession };

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
  completedVideos: number;
  videoTrendPercentage: number;
  totalCycles: number;
}

export type DayActivity = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  intensity: number;
  totalMinutes: number;
};

export interface EfficiencyData {
  ratio: number;
  efficiencyScore: number;
  trend: 'up' | 'down' | 'stable';
  isAlarm: boolean;
  videoMinutes: number;
  pomodoroMinutes: number;
  quizMinutes: number;
}

export interface DailyVideoMilestones {
  maxCount: number; // Tüm zamanlardaki maksimum günlük video sayısı
  first5Date: string | null; // İlk kez 5+ video izlenen gün
  first10Date: string | null; // İlk kez 10+ video izlenen gün
}

export interface CumulativeStats {
  totalWorkMinutes: number;
  totalVideoMinutes: number;
  ratio: number;
}

export interface HistoryStats {
  date: string;
  pomodoro: number;
  video: number;
}

export interface FocusTrend {
  date: string;
  minutes: number;
}

export interface EfficiencyTrend {
  date: string;
  score: number;
  workMinutes: number;
  videoMinutes: number;
}

export interface DailyEfficiencySummary {
  efficiencyScore: number;
  totalCycles: number;
  netWorkTimeSeconds: number;
  totalBreakTimeSeconds: number;
  totalPauseTimeSeconds: number;
  pauseCount: number;
  sessions: DetailedSession[];
}

export type Session = {
  id: string;
  lessonName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number; // minutes
  timeline?: {
    type: string;
    start: number;
    end: number;
    duration?: number;
  }[];
  pauseIntervals: { start: string; end: string }[]; // Pause times
};

// BloomStats is now in quizTypes.ts

export type LearningLoad = {
  day: string;
  videoMinutes: number;
  extraStudyMinutes: number; // Test solving, reading etc.
};

export type FocusPowerPoint = {
  date: string; // Day or Month label
  originalDate: string; // ISO Date for sorting
  score: number;
  workMinutes: number;
  breakMinutes: number;
  pauseMinutes: number;
};

// efficiency trend already defined above

// Activity already defined above

export type flowState = 'stuck' | 'deep' | 'optimal' | 'speed' | 'shallow';

// --- Zod Schemas ---
import { z } from 'zod';
import {
  PauseIntervalSchema,
  TimelineEventSchema,
} from '@/features/pomodoro/types/pomodoroTypes';

export { PauseIntervalSchema, TimelineEventSchema };

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

export const RecentSessionSchema = z.object({
  id: z.string(),
  courseName: z.string(),
  date: z.string(),
  durationMinutes: z.number(),
  efficiencyScore: z.number(),
  timeline: z.array(TimelineEventSchema), // Enforce structure on Json
  totalWorkTime: z.number(),
  totalBreakTime: z.number(),
  totalPauseTime: z.number(),
  pauseCount: z.number(),
});
