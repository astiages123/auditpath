import {
  GraduationCap,
  type LucideIcon,
  Medal,
  Star,
  Trophy,
} from 'lucide-react';
import {
  ACHIEVEMENTS,
  getRequirementDescription,
} from '@/features/achievements/logic/achievementsData';
import { getRankIcon, type Rank } from './rankIcons';
import { RANKS } from '../utils/constants';

// ===========================
// === TYPES ===
// ===========================

export interface CelebrationAsset {
  title: string;
  description: string;
  subtitle?: string;
  icon: LucideIcon;
  imageUrl?: string;
  variant: 'course' | 'rank' | 'achievement';
  metadata?: Record<string, unknown>;
}

// ===========================
// === ASSET RETRIEVAL ===
// ===========================

/**
 * Retrieves celebration asset details (title, description, icon, etc.)
 * based on the provided achievement or rank ID.
 *
 * @param id - The ID representing a rank up, course completion, category completion, or standard achievement
 * @returns The generated CelebrationAsset object
 */
export function getCelebrationAsset(id: string): CelebrationAsset {
  try {
    // 1. Rank Achievements
    if (id.startsWith('RANK_UP:')) {
      const rankId = id.split(':')[1];
      const rank = RANKS.find(
        (r: Rank) => r.id === rankId || r.name === rankId
      );

      if (!rank) {
        return {
          variant: 'rank',
          title: 'YENİ UNVAN',
          description: rankId || 'Bilinmeyen Unvan',
          subtitle: 'Seviye atladın!',
          icon: getRankIcon(rankId),
        };
      }

      return {
        variant: 'rank',
        title: 'YENİ UNVAN',
        description: rank.name || rank.id,
        subtitle: rank.motto || 'Seviye atladın!',
        icon: getRankIcon(rank.name),
        imageUrl: rank.imagePath,
      };
    }

    // 2. Course Completions
    if (id.startsWith('COURSE_COMPLETION:')) {
      const courseId = id.split(':')[1];
      return {
        variant: 'course',
        title: 'DERS TAMAMLANDI',
        description: courseId || 'Bilinmeyen Ders',
        subtitle: 'Bu alandaki kadim bilgileri özümsedin.',
        icon: GraduationCap,
        metadata: { courseId },
      };
    }

    // 3. Category/Group Completions
    if (id.startsWith('CATEGORY_COMPLETION:')) {
      const catId = id.split(':')[1];
      return {
        variant: 'achievement',
        title: 'GRUP TAMAMLANDI',
        description: `${catId} TAMAMLANDI`,
        subtitle: 'Bu daldaki tüm dersleri başarıyla bitirdin.',
        icon: Trophy,
      };
    }

    // 4. Standard Achievements
    const achievement = ACHIEVEMENTS.find((a) => a.id === id);
    if (achievement) {
      return {
        variant: 'achievement',
        title: achievement.title,
        description: getRequirementDescription(achievement.requirement),
        subtitle: achievement.motto,
        icon: Medal,
        imageUrl: achievement.imagePath,
        metadata: { achievement },
      };
    }

    // 5. Fallback for unknown IDs
    return {
      variant: 'achievement',
      title: 'BAŞARIM AÇILDI',
      description: 'Bilinmeyen Başarım',
      subtitle: 'Yeni bir başarıma imza attın.',
      icon: Star,
    };
  } catch (error) {
    console.error('[celebrationAssets][getCelebrationAsset] Error:', error);
    return {
      variant: 'achievement',
      title: 'HATA',
      description: 'Başarım bilgisi alınamadı',
      icon: Star,
    };
  }
}
