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

export type flowState = "stuck" | "deep" | "optimal" | "speed" | "shallow";

// --- Zod Schemas ---
import { z } from "zod";

export const TimelineEventSchema = z.object({
  type: z.enum([
    "work",
    "break",
    "pause",
    "çalışma",
    "mola",
    "duraklatma",
    "duraklama",
  ]).transform((val) => {
    // Normalize to English
    const v = val.toLowerCase();
    if (v === "çalışma") return "work";
    if (v === "mola") return "break";
    if (v === "duraklatma" || v === "duraklama") return "pause";
    return v as "work" | "break" | "pause";
  }),
  start: z.number(),
  end: z.number().optional(),
  duration: z.number().optional(),
});

export const PauseIntervalSchema = z.object({
  start: z.string(),
  end: z.string(),
});

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
