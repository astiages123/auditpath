import {
  type Achievement,
  type GuildType,
  type RequirementType,
} from '../types/achievementsTypes';
import { ACHIEVEMENTS } from './definitions';

function getCategoryDisplayName(slug: string): string {
  const displayNames: Record<string, string> = {
    HUKUK: 'Hukuk',
    EKONOMI: 'Ekonomi',
    MUHASEBE_MALIYE: 'Muhasebe ve Maliye',
    GENEL_YETENEK: 'Genel Yetenek',
  };
  return displayNames[slug] || slug;
}

export function getRequirementDescription(
  requirement: RequirementType
): string {
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
    case 'streak':
      return `${requirement.days} gün kesintisiz çalışma`;
    case 'daily_progress':
      return `Toplam ${requirement.count}+ video tamamla`;
    case 'total_active_days':
      return `Toplam ${requirement.days} gün aktif bilgelik`;
    case 'minimum_videos':
      return `Toplam ${requirement.count} video tamamla`;
    default:
      return 'Gizli gereksinim';
  }
}

export function getAchievementsByGuild(): Map<GuildType, Achievement[]> {
  const grouped = new Map<GuildType, Achievement[]>();
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
  return grouped;
}
