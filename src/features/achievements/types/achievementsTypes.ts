import type { Rank } from "@/types";

export type GuildType =
    | "HUKUK"
    | "EKONOMI"
    | "MUHASEBE_MALIYE"
    | "GENEL_YETENEK"
    | "HYBRID"
    | "SPECIAL"
    | "TITLES"
    | "MASTERY";

export interface GuildInfo {
    id: GuildType;
    name: string;
    description: string;
    color: string;
    topicMasteryBadge?: string;
}

export type RequirementType =
    | { type: "category_progress"; category: string; percentage: number }
    | {
        type: "multi_category_progress";
        categories: { category: string; percentage: number }[];
    }
    | { type: "all_progress"; percentage: number }
    | { type: "streak"; days: number }
    | { type: "daily_progress"; count: number }
    | { type: "total_active_days"; days: number }
    | { type: "minimum_videos"; count: number };

export interface Achievement {
    id: string;
    title: string;
    motto: string;
    imagePath: string;
    guild: GuildType;
    requirement: RequirementType;
    order: number;
    isPermanent?: boolean;
}

// Rank is imported from global types

interface CategoryProgress {
    completedVideos: number;
    totalVideos: number;
    completedHours: number;
    totalHours: number;
}

export interface ProgressStats {
    completedVideos: number;
    totalVideos: number;
    completedHours: number;
    totalHours: number;
    streak: number;
    todayVideoCount?: number;
    categoryProgress: Record<string, CategoryProgress>;
    courseProgress: Record<string, number>;
    currentRank?: Rank;
    nextRank?: Rank | null;
    rankProgress?: number;
    progressPercentage?: number;
    estimatedDays?: number;
    dailyAverage?: number;
}

export interface ActivityLog {
    currentStreak: number;
    totalActiveDays: number;
    dailyVideosCompleted: number;
}

// Topic Mastery Stats for badge unlocking
export interface TopicMasteryStats {
    topicId: string;
    courseId: string;
    totalQuestions: number;
    masteredQuestions: number; // Level 5 questions
    isMastered: boolean; // All questions at Level 5
}
