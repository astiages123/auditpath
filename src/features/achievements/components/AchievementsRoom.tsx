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
  LibraryBig,
} from 'lucide-react';
import { getUnlockedAchievements as getDbUnlocked } from '@/features/achievements/services/achievementService';
import { type UnlockedAchievement } from '@/features/achievements/types/achievementsTypes';
import {
  ACHIEVEMENTS,
  GUILDS,
  getAchievementsByGuild,
} from '../logic/achievementsData';
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

  const totalAchievements = ACHIEVEMENTS.filter(
    (a) => a.guild !== 'TITLES'
  ).length;
  const unlockedCount = Array.from(unlockedAchievements.keys()).filter((id) => {
    const achievement = ACHIEVEMENTS.find((a) => a.id === id);
    return achievement && achievement.guild !== 'TITLES';
  }).length;
  const completionRate = Math.round((unlockedCount / totalAchievements) * 100);

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center gap-5 mb-8">
        <div className="relative group">
          <div className="absolute -inset-1 bg-linear-to-r rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative p-4 rounded-xl bg-card border border-border/50 leading-none flex items-center">
            <LibraryBig className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div>
          <h1
            className="text-3xl md:text-4xl font-black text-foreground tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Bilgelik Arşivi
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Gerçek mühürler kağıda değil, zihne vurulur.
          </p>
        </div>

        {/* Stats on the right */}
        <div className="flex items-center gap-6 ml-auto">
          <div className="hidden sm:block text-right">
            <div className="text-xs text-foreground uppercase tracking-widest mb-1">
              Genel Aydınlanma
            </div>
            <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-start gap-3 px-4 py-3 sm:py-2 rounded-xl bg-card border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Scroll className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left sm:text-right">
                <div className="text-lg font-bold text-foreground">
                  {unlockedCount}
                  <span className="text-muted-foreground text-sm font-normal">
                    /{totalAchievements}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-tighter">
                  Mühür Çözüldü
                </div>
              </div>
            </div>
            <div className="sm:hidden text-right">
              <div className="text-lg font-black text-primary">
                %{completionRate}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">
                Aydınlanma
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lonca Bölümleri */}
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
                  <h2 className={`text-xl font-bold flex items-center gap-3`}>
                    {/* İsim */}
                    <span>{guild.name}</span>

                    {/* Dinamik İkon (Lonca Rengiyle) */}
                    <span
                      style={{
                        color: guild.color,
                      }}
                    >
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
      </div>

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
    </>
  );
}
