/**
 * Aggregates all logic and types related to achievements for simplified imports.
 */

export { ACHIEVEMENTS, GUILDS } from './definitions';

export {
  getAchievementsByGuild,
  getRequirementDescription,
} from './achievementUtils';

export {
  calculateAchievements,
  checkTopicMastery,
  isAchievementUnlocked,
} from './achievementEngine';

export type {
  Achievement,
  ActivityLog,
  GuildInfo,
  GuildType,
  ProgressStats,
  RequirementType,
  TopicMasteryStats,
} from '../types/achievementsTypes';
