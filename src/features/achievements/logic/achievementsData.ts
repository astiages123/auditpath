export { GUILDS } from './guilds';
export { ACHIEVEMENTS } from './definitions';
export {
  getRequirementDescription,
  getAchievementsByGuild,
} from './achievementUtils';
export {
  calculateAchievements,
  isAchievementUnlocked,
  checkTopicMastery,
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
