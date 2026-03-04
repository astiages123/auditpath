// ===========================
// === EXPORT AGGREGATOR ===
// ===========================

/**
 * Aggregates all logic and types related to achievements for simplified imports.
 */

// Definitions
export { ACHIEVEMENTS, GUILDS } from './definitions';

// Utility & Formatting
export {
  getAchievementsByGuild,
  getRequirementDescription,
} from './achievementUtils';

// Core Engine Logic
export {
  calculateAchievements,
  checkTopicMastery,
  isAchievementUnlocked,
} from './achievementEngine';

// Types
export type {
  Achievement,
  ActivityLog,
  GuildInfo,
  GuildType,
  ProgressStats,
  RequirementType,
  TopicMasteryStats,
} from '../types/achievementsTypes';
