import { Json } from "@/types/common";
import { QuizInsert } from "@/features/quiz/types/quizTypes";
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
        "WORK",
        "BREAK",
        "PAUSE",
    ]).transform((val) => {
        // Normalize to English
        const v = val.toLowerCase();
        if (v === "çalışma") return "work";
        if (v === "mola") return "break";
        if (v === "duraklatma" || v === "duraklama") return "pause";
        return v as "work" | "break" | "pause";
    }),
    start: z.number(),
    end: z.number().optional().nullable(),
    duration: z.number().optional(),
});

export type ValidatedTimelineEvent = z.infer<typeof TimelineEventSchema>;

export const PauseIntervalSchema = z.object({
    start: z.string(),
    end: z.string(),
});

export interface PomodoroInsert {
    course_id: string;
    course_name?: string | null;
    started_at: string;
    ended_at: string;
    total_work_time?: number | null;
    total_break_time?: number | null;
    total_pause_time?: number | null;
    timeline?: Json; // Matches Json type in DB
    notes?: string;
}

export interface VideoUpsert {
    video_id: string;
    course_id?: string;
    completed?: boolean;
    completed_at?: string | null;
    progress_seconds?: number;
    last_watched_at?: string;
}

export type ActivityData = PomodoroInsert | VideoUpsert | QuizInsert;

export interface RecentActivity {
    id: string;
    type: "pomodoro" | "video" | "quiz";
    title: string;
    date: string;
    durationMinutes?: number;
}

export interface TimelineBlock {
    id: string;
    courseName: string;
    startTime: string;
    endTime: string;
    durationSeconds: number;
    totalDurationSeconds: number;
    pauseSeconds: number;
    breakSeconds?: number;
    type: "work" | "break" | "WORK" | "BREAK";
    timeline?: Json[];
}

export interface DetailedSession {
    id: string;
    courseName: string;
    workTimeSeconds: number;
    breakTimeSeconds: number;
    pauseTimeSeconds: number;
    efficiencyScore: number;
    timeline: Json[];
    startedAt: string;
}

export interface RecentSession {
    id: string;
    courseName: string;
    date: string; // ISO string
    durationMinutes: number;
    efficiencyScore: number;
    timeline: Json[];
    totalWorkTime: number;
    totalBreakTime: number;
    totalPauseTime: number;
    pauseCount: number;
}
