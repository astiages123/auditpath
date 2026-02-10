import { Json } from "./supabase";
import { Database } from "./supabase";

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

export interface DayActivity {
    date: string;
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
    intensity: number;
    totalMinutes: number;
}

export interface EfficiencyData {
    ratio: number;
    efficiencyScore: number;
    trend: "up" | "down" | "stable";
    isAlarm: boolean;
    videoMinutes: number;
    pomodoroMinutes: number;
    quizMinutes: number;
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

export interface UnlockedAchievement {
    achievement_id: string;
    unlockedAt: string;
}

export interface DailyVideoMilestones {
    maxCount: number; // Tüm zamanlardaki maksimum günlük video sayısı
    first5Date: string | null; // İlk kez 5+ video izlenen gün
    first10Date: string | null; // İlk kez 10+ video izlenen gün
}

export interface StreakMilestones {
    maxStreak: number;
    first7StreakDate: string | null; // İlk kez 7+ günlük streak tamamlandığı gün
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

export type CourseTopic =
    & Omit<
        Database["public"]["Tables"]["note_chunks"]["Row"],
        "attempts" | "error_message"
    >
    & {
        questionCount?: number;
        density_score?: number | null;
        word_count?: number | null;
    };

export interface TopicCompletionStats {
    completed: boolean;
    antrenman: {
        solved: number;
        total: number;
        quota: number;
        existing: number;
    };
    deneme: { solved: number; total: number; quota: number; existing: number };
    arsiv: {
        solved: number;
        total: number;
        quota: number;
        existing: number;
        srsDueCount: number;
    };
    mistakes: { solved: number; total: number; existing: number };
    examTarget?: number;
    importance?: "high" | "medium" | "low";
}

export interface TopicWithCounts {
    name: string;
    isCompleted: boolean; // Computed on client side or simplified fetch?
    counts: {
        antrenman: number;
        arsiv: number;
        deneme: number;
        total: number;
    };
}

export interface QuizStats {
    totalAnswered: number;
    correct: number;
    incorrect: number;
    blank: number;
    remaining: number;
    successRate: number;
}

export interface SubjectCompetency {
    subject: string;
    score: number; // 0-100
    totalQuestions: number;
}

export interface BloomStats {
    level: string;
    correct: number;
    total: number;
    score: number;
}

export interface SRSStats {
    new: number;
    learning: number;
    review: number;
    mastered: number;
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

export interface SessionResultStats {
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    blankCount: number;
    timeSpentMs: number;
    courseId: string;
    userId: string;
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

export interface DailyEfficiencySummary {
    efficiencyScore: number;
    totalCycles: number;
    netWorkTimeSeconds: number;
    totalBreakTimeSeconds: number;
    totalPauseTimeSeconds: number;
    pauseCount: number;
    sessions: DetailedSession[];
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

export interface RecentQuizSession {
    uniqueKey: string;
    courseName: string;
    sessionNumber: number;
    date: string;
    correct: number;
    incorrect: number;
    blank: number;
    total: number;
    successRate: number;
}

export interface CognitiveInsight {
    id: string;
    courseId: string;
    questionId: string;
    diagnosis: string | null;
    insight: string | null;
    consecutiveFails: number;
    responseType: string;
    date: string;
}

export interface CourseMastery {
    courseId: string;
    courseName: string;
    videoProgress: number; // 0-100
    questionProgress: number; // 0-100
    masteryScore: number; // (video * 0.6) + (question * 0.4)
}
