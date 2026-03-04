import {
  type Achievement,
  type ActivityLog,
  type ProgressStats,
  type TopicMasteryStats,
} from '../types/achievementsTypes';
import { ACHIEVEMENTS } from './definitions';

// ===========================
// === MASTERY CHECKS ===
// ===========================

/**
 * Checks if a specific topic within a course has been mastered by the user.
 *
 * @param topicStats - Array of topic mastery statistics for the user
 * @param topicId - ID of the topic to check
 * @param courseId - ID of the course the topic belongs to
 * @returns boolean indicating if the topic is mastered
 */
export function checkTopicMastery(
  topicStats: TopicMasteryStats[],
  topicId: string,
  courseId: string
): boolean {
  try {
    const topic = topicStats.find(
      (t) => t.topicId === topicId && t.courseId === courseId
    );
    return topic?.isMastered ?? false;
  } catch (error) {
    console.error('[achievementEngine][checkTopicMastery] Error:', error);
    return false;
  }
}

// ===========================
// === ACHIEVEMENT CALCULATION ===
// ===========================

/**
 * Calculates and returns a list of all achievement IDs that the user has currently unlocked,
 * based on their current progress statistics and activity log.
 *
 * @param stats - The user's current progress statistics
 * @param log - The user's activity log including streaks and active days
 * @returns Array of unlocked achievement IDs
 */
export function calculateAchievements(
  stats: ProgressStats,
  log: ActivityLog
): string[] {
  try {
    return ACHIEVEMENTS.filter((acc) =>
      isAchievementUnlocked(acc, stats, log)
    ).map((acc) => acc.id);
  } catch (error) {
    console.error('[achievementEngine][calculateAchievements] Error:', error);
    return [];
  }
}

// ===========================
// === UNLOCK LOGIC ===
// ===========================

/**
 * Evaluates whether a single achievement's requirements are met by the user's stats and log.
 *
 * @param achievement - The achievement to test
 * @param stats - The user's progress statistics
 * @param log - The user's activity log
 * @returns boolean indicating if the specific achievement is unlocked
 */
export function isAchievementUnlocked(
  achievement: Achievement,
  stats: ProgressStats,
  log: ActivityLog
): boolean {
  try {
    const req = achievement.requirement;

    // Evaluate the requirement based on its discriminant 'type'
    switch (req.type) {
      case 'category_progress': {
        const cat = stats.categoryProgress[req.category];
        // Ensure the category exists and has a total greater than zero to avoid division by zero
        if (!cat || cat.totalHours === 0) return false;
        const percent = (cat.completedHours / cat.totalHours) * 100;
        return percent >= req.percentage;
      }

      case 'multi_category_progress': {
        // Every listed category in the requirement must meet its specified percentage
        return req.categories.every((c) => {
          const p = stats.categoryProgress[c.category];
          if (!p || p.totalHours === 0) return false;
          const percent = (p.completedHours / p.totalHours) * 100;
          return percent >= c.percentage;
        });
      }

      case 'all_progress': {
        // Check progress against total hours across all categories
        if (stats.totalHours === 0) return false;
        const percent = (stats.completedHours / stats.totalHours) * 100;
        return percent >= req.percentage;
      }

      case 'streak': {
        // Unlocked if current streak is greater than or equal to required days
        return log.currentStreak >= req.days;
      }

      case 'daily_progress': {
        // Unlocked if the videos completed today meets or exceeds the required count
        return log.dailyVideosCompleted >= req.count;
      }

      case 'total_active_days': {
        // Unlocked based on the lifetime total active days of the user
        return log.totalActiveDays >= req.days;
      }

      case 'minimum_videos': {
        // Unlocked based on the total number of videos completed all-time
        return stats.completedVideos >= req.count;
      }

      default:
        return false;
    }
  } catch (error) {
    console.error('[achievementEngine][isAchievementUnlocked] Error:', error);
    return false;
  }
}
