import type { Json } from "@/types/database.types";

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

export { type BloomStats } from "@/types";

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

export type EfficiencyTrend = {
  date: string;
  score: number;
  videoMinutes: number;
  workMinutes: number;
};

export type RecentSession = {
  id: string;
  courseName: string;
  date: string;
  durationMinutes: number;
  efficiencyScore: number;
  timeline: Json[];
  totalWorkTime: number;
  totalBreakTime: number;
  totalPauseTime: number;
  pauseCount: number;
};

export type DayActivity = {
  date: string;
  totalMinutes: number;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  intensity: number;
};
