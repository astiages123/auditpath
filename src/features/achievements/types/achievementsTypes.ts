import type { Rank } from '@/types/auth';

// ===========================
// === BASIC TYPES ===
// ===========================

/**
 * Represents an achievement unlocked by the user.
 */
export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

// ===========================
// === GUILD TYPES ===
// ===========================

/**
 * Represents the type of a guild.
 */
export type GuildType =
  | 'HUKUK'
  | 'IKTISAT'
  | 'MUHASEBE_MALIYE'
  | 'GY_GK'
  | 'SIYASAL_BILGILER'
  | 'HYBRID'
  | 'SPECIAL'
  | 'TITLES'
  | 'MASTERY';

/**
 * Represents information about a specific guild.
 */
export interface GuildInfo {
  id: GuildType;
  name: string;
  description: string;
  color: string;
  topicMasteryBadge?: string;
}

// ===========================
// === ACHIEVEMENT DEFINITIONS ===
// ===========================

/**
 * Represents the requirements to unlock an achievement.
 */
export type RequirementType =
  | { type: 'category_progress'; category: string; percentage: number }
  | {
      type: 'multi_category_progress';
      categories: { category: string; percentage: number }[];
    }
  | { type: 'all_progress'; percentage: number }
  | { type: 'daily_progress'; count: number }
  | { type: 'total_active_days'; days: number }
  | { type: 'minimum_videos'; count: number };

/**
 * Represents a predefined achievement.
 */
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

// ===========================
// === PROGRESS STATS ===
// ===========================

/**
 * Represents progress for a specific category.
 */
export interface CategoryProgress {
  completedVideos: number;
  totalVideos: number;
  completedHours: number;
  totalHours: number;
}

/**
 * Represents overall user progress statistics.
 */
export interface ProgressStats {
  completedVideos: number;
  totalVideos: number;
  completedHours: number;
  totalHours: number;
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

// ===========================
// === ACTIVITY & MASTERY ===
// ===========================

/**
 * Represents a log of user activity.
 */
export interface ActivityLog {
  totalActiveDays: number;
  dailyVideosCompleted: number;
}

/**
 * Represents statistics for topic mastery, used for badge unlocking.
 */
export interface TopicMasteryStats {
  topicId: string;
  courseId: string;
  totalQuestions: number;
  masteredQuestions: number; // Level 5 questions
  isMastered: boolean; // All questions at Level 5
}
