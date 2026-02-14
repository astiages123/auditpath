import { User as SupabaseUser } from "@supabase/supabase-js";
import { Database } from "./database.types";

// --- Core Types ---
/**
 * Standard User interface, potentially extending Supabase User with app-specific fields
 */
export type User = SupabaseUser;

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    status?: number;
}

/**
 * Common timestamp type for consistency
 */
export type Timestamp = string; // ISO String

/**
 * Common Theme/Visual types
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * LLM Interaction Base Types
 */
export interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface AIResponseMetadata {
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        cached_tokens?: number;
        prompt_cache_hit_tokens?: number;
        prompt_cache_miss_tokens?: number;
    };
}

/**
 * General purpose logging callback
 */
export type LogCallback = (
    message: string,
    details?: Record<string, unknown>,
) => void;

/**
 * Rank system types
 */
export interface Rank {
    id: string;
    name: string;
    minPercentage: number;
    color: string;
    motto: string;
    imagePath: string;
    order: number;
}

// --- Analytics Types ---
export interface ExchangeRate {
    currency_pair: string;
    rate: number;
    updated_at: string;
}

export interface AiGenerationCost {
    id: string;
    user_id: string;
    provider: string;
    model: string;
    usage_type: string | null;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    cached_tokens: number | null;
    total_tokens: number | null;
    created_at: string | null;
    cost_usd: number | null;
    latency_ms: number | null;
    status: number | null;
}

// --- Course Types ---
export type Course = Database["public"]["Tables"]["courses"]["Row"];

export type Category = Database["public"]["Tables"]["categories"]["Row"] & {
    courses: Course[];
};

// --- Quiz Types ---
export interface ConceptMapItem {
    baslik: string;
    odak: string;
    seviye: "Bilgi" | "Uygulama" | "Analiz";
    gorsel: string | null;
    altText?: string | null;
    isException?: boolean;
    prerequisites?: string[];
    [key: string]: unknown;
}

export interface ConceptMapResult {
    difficulty_index: number;
    concepts: ConceptMapItem[];
}

export type QuizResponseType = "correct" | "incorrect" | "blank";

export type QuizQuestionType = "multiple_choice" | "true_false";

export interface BaseQuestion {
    id?: string;
    q: string; // Question text
    exp: string; // Explanation
    img?: number | null; // Index of the image in imageUrls array
    imageUrls?: string[]; // Array of image URLs for the chunk
    imgPath?: string | null; // Legacy/Optional path override
    diagnosis?: string;
    insight?: string;
    evidence?: string;
    chunk_id?: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
    type: "multiple_choice";
    o: string[]; // Typically 5 options
    a: number; // Correct index
}

export interface TrueFalseQuestion extends BaseQuestion {
    type: "true_false";
    o: string[]; // ["Doğru", "Yanlış"]
    a: number; // 0 or 1
}

export type QuizQuestion = MultipleChoiceQuestion | TrueFalseQuestion;

// --- Tracking Types ---
export type Json =
    Database["public"]["Tables"]["note_chunks"]["Row"]["metadata"];

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

export interface QuizInsert {
    question_id: string;
    course_id: string;
    chunk_id?: string | null;
    is_correct?: boolean;
    confidence_level?: "LOW" | "MEDIUM" | "HIGH";
    answered_at?: string | null;
    response_time_ms?: number | null;
    response_type: "correct" | "incorrect" | "blank";
    session_number: number;
    ai_diagnosis?: string | null;
    ai_insight?: string | null;
}

export type ActivityData = PomodoroInsert | VideoUpsert | QuizInsert;

export interface RecentActivity {
    id: string;
    type: "pomodoro" | "video" | "quiz";
    title: string;
    date: string;
    durationMinutes?: number;
}

// --- Efficiency Types ---
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

export type CourseTopic = Database["public"]["Tables"]["note_chunks"]["Row"] & {
    questionCount?: number;
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
    importance?: "high" | "medium" | "low";
    aiLogic?: {
        suggested_quotas: {
            antrenman: number;
            arsiv: number;
            deneme: number;
        };
    } | null;
    concepts?: ConceptMapItem[] | null;
    difficultyIndex?: number | null;
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
