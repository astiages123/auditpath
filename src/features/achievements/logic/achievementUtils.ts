import {
  type Achievement,
  type GuildType,
  type RequirementType,
} from '../types/achievementsTypes';
import { ACHIEVEMENTS } from './definitions';

// ===========================
// === FORMATTING & DISPLAY ===
// ===========================

/**
 * Returns a human-readable display name for an achievement category.
 *
 * @param slug - The raw category identifier
 * @returns Formatted display name for the UI
 */
function getCategoryDisplayName(slug: string): string {
  const displayNames: Record<string, string> = {
    HUKUK: 'Hukuk',
    IKTISAT: 'İktisat',
    MUHASEBE_MALIYE: 'Muhasebe ve Maliye',
    GY_GK: 'Genel Yetenek - Genel Kültür',
    SIYASAL_BILGILER: 'Siyasal Bilgiler',
  };
  return displayNames[slug] || slug;
}

/**
 * Generates a descriptive string for a given achievement requirement.
 *
 * @param requirement - The requirement object detailing unlock conditions
 * @returns Human-readable description of how to unlock the achievement
 */
export function getRequirementDescription(
  requirement: RequirementType
): string {
  try {
    switch (requirement.type) {
      case 'category_progress':
        return `${getCategoryDisplayName(
          requirement.category
        )} öğretilerinde %${requirement.percentage} aydınlanma`;
      case 'multi_category_progress':
        return requirement.categories
          .map((c) => `${getCategoryDisplayName(c.category)} %${c.percentage}`)
          .join(' + ');
      case 'all_progress':
        return `Tüm ilimlerde %${requirement.percentage} ilerleme`;
      case 'daily_progress':
        return `Toplam ${requirement.count}+ video tamamla`;
      case 'total_active_days':
        return `Toplam ${requirement.days} gün aktif bilgelik`;
      case 'minimum_videos':
        return `Toplam ${requirement.count} video tamamla`;
      default:
        return 'Gizli gereksinim';
    }
  } catch (error) {
    console.error(
      '[achievementUtils][getRequirementDescription] Error:',
      error
    );
    return 'Gereksinim okunamadı';
  }
}

// ===========================
// === DATA GROUPING ===
// ===========================

/**
 * Groups all system achievements by their respective Guild and sorts them by order.
 *
 * @returns Map of GuildType to sorted arrays of Achievement objects
 */
export function getAchievementsByGuild(): Map<GuildType, Achievement[]> {
  const grouped = new Map<GuildType, Achievement[]>();
  try {
    for (const achievement of ACHIEVEMENTS) {
      const existing = grouped.get(achievement.guild) || [];
      existing.push(achievement);
      grouped.set(achievement.guild, existing);
    }
    for (const [guild, achievements] of grouped) {
      grouped.set(
        guild,
        achievements.sort((a, b) => a.order - b.order)
      );
    }
  } catch (error) {
    console.error('[achievementUtils][getAchievementsByGuild] Error:', error);
  }
  return grouped;
}
