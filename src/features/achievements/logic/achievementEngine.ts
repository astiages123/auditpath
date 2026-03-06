import {
  type Achievement,
  type ActivityLog,
  type ProgressStats,
  type TopicMasteryStats,
} from '../types/achievementsTypes';
import { ACHIEVEMENTS } from './definitions';

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
  const topic = topicStats.find(
    (topicStat) =>
      topicStat.topicId === topicId && topicStat.courseId === courseId
  );

  return topic?.isMastered ?? false;
}

/**
 * Calculates and returns a list of all achievement IDs that the user has currently unlocked,
 * based on their current progress statistics and activity log.
 *
 * @param stats - The user's current progress statistics
 * @param log - The user's activity log including active days
 * @returns Array of unlocked achievement IDs
 */
export function calculateAchievements(
  stats: ProgressStats,
  log: ActivityLog
): string[] {
  return ACHIEVEMENTS.filter((achievement) =>
    isAchievementUnlocked(achievement, stats, log)
  ).map((achievement) => achievement.id);
}

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
  const requirement = achievement.requirement;

  switch (requirement.type) {
    case 'category_progress': {
      const categoryProgress = stats.categoryProgress[requirement.category];
      if (!categoryProgress || categoryProgress.totalHours === 0) return false;

      const percentage =
        (categoryProgress.completedHours / categoryProgress.totalHours) * 100;
      return percentage >= requirement.percentage;
    }

    case 'multi_category_progress':
      return requirement.categories.every((categoryRequirement) => {
        const categoryProgress =
          stats.categoryProgress[categoryRequirement.category];

        if (!categoryProgress || categoryProgress.totalHours === 0) {
          return false;
        }

        const percentage =
          (categoryProgress.completedHours / categoryProgress.totalHours) * 100;
        return percentage >= categoryRequirement.percentage;
      });

    case 'all_progress': {
      if (stats.totalHours === 0) return false;

      const percentage = (stats.completedHours / stats.totalHours) * 100;
      return percentage >= requirement.percentage;
    }

    case 'daily_progress':
      return log.dailyVideosCompleted >= requirement.count;

    case 'total_active_days':
      return log.totalActiveDays >= requirement.days;

    case 'minimum_videos':
      return stats.completedVideos >= requirement.count;

    default:
      return false;
  }
}
