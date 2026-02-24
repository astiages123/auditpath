import { useState, useEffect } from 'react';
// Yeni ikonlar eklendi: Scale (Hukuk), Coins (Ekonomi), Landmark (Muhasebe), Globe (Genel)
import {
  Scroll,
  Sparkles,
  Scale,
  Coins,
  Landmark,
  Globe,
  Crown,
  Award,
} from 'lucide-react';
import { getUnlockedAchievements as getDbUnlocked } from '@/features/achievements/services/achievementService';
import { type UnlockedAchievement } from '@/features/achievements/types/achievementsTypes';
import { GUILDS, getAchievementsByGuild } from '../logic/achievementsData';
import { Achievement, GuildType } from '../types/achievementsTypes';
import { useProgress } from '@/shared/hooks/useProgress';
import { SealCard } from './SealCard';
import { SealDetailModal } from './SealDetailModal';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { logger } from '@/utils/logger';

const GUILD_ORDER: GuildType[] = [
  'HUKUK',
  'EKONOMI',
  'MUHASEBE_MALIYE',
  'GENEL_YETENEK',
  'MASTERY',
  'HYBRID',
  'SPECIAL',
];

// Her lonca için tematik ikon haritası
const GUILD_ICONS: Record<GuildType, React.ReactNode> = {
  HUKUK: <Scale className="w-5 h-5" />, // Terazi (Adalet)
  EKONOMI: <Coins className="w-5 h-5" />, // Sikkeler (Altın Akış)
  MUHASEBE_MALIYE: <Landmark className="w-5 h-5" />, // Hazine Binası (Muhafızlar)
  GENEL_YETENEK: <Globe className="w-5 h-5" />, // Dünya Küresi (Yedi Diyar)
  HYBRID: <Scroll className="w-5 h-5" />, // Parşömen (Kadim İlimler)
  SPECIAL: <Sparkles className="w-5 h-5" />, // Işıltı (Büyü/Ustalık)
  MASTERY: <Crown className="w-5 h-5" />, // Taç (Ustalık/Liderlik)
  TITLES: <Award className="w-5 h-5" />, // Ödül/Madalya (Unvanlar)
};

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

  useEffect(() => {
    if (isLoading || !user || !stats) return;

    const fetchUnlockedAchievements = async () => {
      try {
        const dbUnlocked = await getDbUnlocked(user.id);

        // Update state with achievements from database
        // Using achievement_id as the key in the map
        setUnlockedAchievements(
          new Map(
            dbUnlocked.map((a: UnlockedAchievement) => [a.id, a.unlockedAt])
          )
        );
      } catch (error) {
        logger.error('Bilgelik Arşivi veri çekme hatası:', error as Error);
      }
    };

    fetchUnlockedAchievements();
  }, [stats, isLoading, user]);

  const handleSealClick = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-16">
        {GUILD_ORDER.map((guildId) => {
          const guild = GUILDS[guildId];
          const achievements = achievementsByGuild.get(guildId) || [];

          if (achievements.length === 0) return null;

          return (
            <section key={guildId} className="relative">
              {/* Lonca Başlığı */}
              <div className="flex items-center gap-4 mb-8">
                <div
                  className="w-1.5 h-10 rounded-full"
                  style={{
                    backgroundColor: guild.color,
                  }}
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

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
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

        <SealDetailModal
          achievement={selectedAchievement}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAchievement(null);
          }}
          isUnlocked={
            selectedAchievement
              ? unlockedAchievements.has(selectedAchievement.id)
              : false
          }
          unlockedAt={
            selectedAchievement
              ? unlockedAchievements.get(selectedAchievement.id)
              : null
          }
        />
      </div>
    </>
  );
}
