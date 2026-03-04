import { useState, useEffect } from 'react';
import {
  Scroll,
  Sparkles,
  Scale,
  Coins,
  Landmark,
  Globe,
  Crown,
  Award,
  Building,
} from 'lucide-react';
import { getUnlockedAchievements as getDbUnlocked } from '@/features/achievements/services/achievementService';
import type { UnlockedAchievement } from '@/features/achievements/types/achievementsTypes';
import {
  GUILDS,
  getAchievementsByGuild,
} from '@/features/achievements/logic/achievementsData';
import type {
  Achievement,
  GuildType,
} from '@/features/achievements/types/achievementsTypes';
import { useProgress } from '@/shared/hooks/useProgress';
import { SealCard } from '@/features/achievements/components/cards/SealCard';
import { SealDetailModal } from '@/features/achievements/components/modals/SealDetailModal';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { logger } from '@/utils/logger';

// ===========================
// === CONSTANTS ===
// ===========================

const GUILD_ORDER: GuildType[] = [
  'HUKUK',
  'IKTISAT',
  'MUHASEBE_MALIYE',
  'SIYASAL_BILGILER',
  'GY_GK',
  'MASTERY',
  'HYBRID',
  'SPECIAL',
];

const GUILD_ICONS: Record<GuildType, React.ReactNode> = {
  HUKUK: <Scale className="w-5 h-5" />,
  IKTISAT: <Coins className="w-5 h-5" />,
  MUHASEBE_MALIYE: <Landmark className="w-5 h-5" />,
  SIYASAL_BILGILER: <Building className="w-5 h-5" />,
  GY_GK: <Globe className="w-5 h-5" />,
  HYBRID: <Scroll className="w-5 h-5" />,
  SPECIAL: <Sparkles className="w-5 h-5" />,
  MASTERY: <Crown className="w-5 h-5" />,
  TITLES: <Award className="w-5 h-5" />,
};

// ===========================
// === COMPONENT ===
// ===========================

/**
 * AchievementsRoom Component
 * Main view displaying grouped achievements by Guild and their unlock status.
 */
export function AchievementsRoom() {
  const { stats, isLoading } = useProgress();
  const { user } = useAuth();

  const [unlockedAchievements, setUnlockedAchievements] = useState<
    Map<string, string>
  >(new Map());
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const achievementsByGuild = getAchievementsByGuild();

  // Fetch Unlocked Achievements
  useEffect(() => {
    if (isLoading || !user || !stats) return;

    const fetchUnlockedAchievements = async () => {
      try {
        const dbUnlocked = await getDbUnlocked(user.id);
        setUnlockedAchievements(
          new Map(
            dbUnlocked.map((a: UnlockedAchievement) => [a.id, a.unlockedAt])
          )
        );
      } catch (error) {
        logger.error(
          'AchievementsRoom',
          'fetchUnlockedAchievements',
          'Bilgelik Arşivi veri çekme hatası:',
          error
        );
      }
    };

    fetchUnlockedAchievements();
  }, [stats, isLoading, user]);

  // Handlers
  const handleSealClick = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAchievement(null);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-10 md:space-y-16">
        {GUILD_ORDER.map((guildId) => {
          const guild = GUILDS[guildId];
          const achievements = achievementsByGuild.get(guildId) || [];

          if (achievements.length === 0) return null;

          return (
            <section key={guildId} className="relative">
              {/* Guild Header */}
              <div className="flex items-center gap-4 mb-5 md:mb-8">
                <div
                  className="w-1.5 h-10 rounded-full"
                  style={{ backgroundColor: guild.color }}
                />
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <span>{guild.name}</span>
                    <span style={{ color: guild.color }}>
                      {GUILD_ICONS[guildId]}
                    </span>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {guild.description}
                  </p>
                </div>
              </div>

              {/* Achievements Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
                {achievements.map((achievement) => (
                  <SealCard
                    key={achievement.id}
                    achievement={achievement}
                    isUnlocked={unlockedAchievements.has(achievement.id)}
                    onClick={() => handleSealClick(achievement)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {/* Modal */}
        <SealDetailModal
          achievement={selectedAchievement}
          isOpen={isModalOpen}
          onClose={closeModal}
          isUnlocked={
            selectedAchievement
              ? unlockedAchievements.has(selectedAchievement.id)
              : false
          }
          unlockedAt={
            selectedAchievement
              ? unlockedAchievements.get(selectedAchievement.id) || null
              : null
          }
        />
      </div>
    </>
  );
}
