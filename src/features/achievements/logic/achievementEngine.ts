import {
  type Achievement,
  type ActivityLog,
  type ProgressStats,
  type TopicMasteryStats,
} from '../types/achievementsTypes';
import { ACHIEVEMENTS } from './definitions';

export function checkTopicMastery(
  topicStats: TopicMasteryStats[],
  topicId: string,
  courseId: string
): boolean {
  const topic = topicStats.find(
    (t) => t.topicId === topicId && t.courseId === courseId
  );
  return topic?.isMastered ?? false;
}

export function calculateAchievements(
  stats: ProgressStats,
  log: ActivityLog
): string[] {
  return ACHIEVEMENTS.filter((acc) =>
    isAchievementUnlocked(acc, stats, log)
  ).map((acc) => acc.id);
}

export function isAchievementUnlocked(
  achievement: Achievement,
  stats: ProgressStats,
  log: ActivityLog
): boolean {
  const req = achievement.requirement;
  switch (req.type) {
    case 'category_progress': {
      const cat = stats.categoryProgress[req.category];
      return cat && cat.totalHours > 0
        ? (cat.completedHours / cat.totalHours) * 100 >= req.percentage
        : false;
    }
    case 'multi_category_progress': {
      return req.categories.every((c) => {
        const p = stats.categoryProgress[c.category];
        return p && p.totalHours > 0
          ? (p.completedHours / p.totalHours) * 100 >= c.percentage
          : false;
      });
    }
    case 'all_progress': {
      return stats.totalHours > 0
        ? (stats.completedHours / stats.totalHours) * 100 >= req.percentage
        : false;
    }
    case 'streak':
      return log.currentStreak >= req.days;
    case 'daily_progress':
      return log.dailyVideosCompleted >= req.count;
    case 'total_active_days':
      return log.totalActiveDays >= req.days;
    case 'minimum_videos':
      return stats.completedVideos >= req.count;
    default:
      return false;
  }
}
