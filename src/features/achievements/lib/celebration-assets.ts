import { GraduationCap, LucideIcon, Medal, Star, Trophy } from 'lucide-react';
import {
  ACHIEVEMENTS,
  getRequirementDescription,
} from '@/features/achievements/lib/achievements';
import {
  getRankIcon,
  type Rank,
  RANKS,
} from '@/features/achievements/lib/rank-icons';
import { coursesData, getCourseIcon } from '@/features/courses';

export interface CelebrationAsset {
  title: string;
  description: string;
  subtitle?: string;
  icon: LucideIcon;
  imageUrl?: string;
  variant: 'course' | 'rank' | 'achievement';
  metadata?: Record<string, unknown>;
}

interface CategoryData {
  category: string;
  courses: Array<{ id: string; totalVideos: number; name: string }>;
}

export function getCelebrationAsset(id: string): CelebrationAsset {
  // 1. Rank Achievements
  if (id.startsWith('RANK_UP:')) {
    const rankId = id.split(':')[1];
    const rank = RANKS.find((r: Rank) => r.id === rankId || r.name === rankId);
    if (!rank) {
      return {
        variant: 'rank',
        title: 'YENİ UNVAN',
        description: rankId,
        subtitle: 'Seviye atladın!',
        icon: getRankIcon(rankId),
      };
    }

    return {
      variant: 'rank',
      title: 'YENİ UNVAN',
      description: rank?.name || rankId,
      subtitle: rank?.motto || 'Seviye atladın!',
      icon: getRankIcon(rank?.name),
      imageUrl: rank?.imagePath,
    };
  }

  // 2. Course Completions
  if (id.startsWith('COURSE_COMPLETION:')) {
    const courseId = id.split(':')[1];
    let courseName = courseId;
    let CourseIcon = GraduationCap;

    // Find course name from JSON
    for (const cat of coursesData as CategoryData[]) {
      const c = cat.courses.find(
        (c: { id: string; name: string }) => c.id === courseId
      );
      if (c) {
        courseName = c.name || courseName;
        CourseIcon = getCourseIcon(courseName) || GraduationCap;
        break;
      }
    }

    return {
      variant: 'course',
      title: 'DERS TAMAMLANDI',
      description: courseName,
      subtitle: 'Bu alandaki kadim bilgileri özümsedin.',
      icon: CourseIcon,
      metadata: { courseId },
    };
  }

  // 3. Category/Group Completions
  if (id.startsWith('CATEGORY_COMPLETION:')) {
    const catId = id.split(':')[1];
    return {
      variant: 'achievement', // Distinct background using achievement styling which is purple/gold
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
      icon: Medal, // Default icon if not specified elsewhere, or map guild icons?
      imageUrl: achievement.imagePath, // Use the stamp/seal image
      metadata: { achievement },
    };
  }

  // Fallback for unknown IDs
  return {
    variant: 'achievement',
    title: 'BAŞARIM AÇILDI',
    description: 'Bilinmeyen Başarım',
    subtitle: 'Yeni bir başarıma imza attın.',
    icon: Star,
  };
}
