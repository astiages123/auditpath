"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
// Yeni ikonlar eklendi: Scale (Hukuk), Coins (Ekonomi), Landmark (Muhasebe), Globe (Genel)
import {
  Library,
  Scroll,
  Sparkles,
  Scale,
  Coins,
  Landmark,
  Globe,
  Crown,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  getUnlockedAchievements as getDbUnlocked,
  unlockAchievement as unlockDb,
  getTotalActiveDays as getDbTotalActiveDays,
  UnlockedAchievement,
} from "@/lib/client-db";
import {
  Achievement,
  GUILDS,
  GuildType,
  getAchievementsByGuild,
  ACHIEVEMENTS,
  calculateAchievements,
} from "@/lib/achievements";
import { useProgress } from "@/hooks/useProgress";
import { SealCard } from "./SealCard";
import { SealDetailModal } from "./SealDetailModal";
import { useAuth } from "@/hooks/useAuth";

const GUILD_ORDER: GuildType[] = [
  "HUKUK",
  "EKONOMI",
  "MUHASEBE_MALIYE",
  "GENEL_YETENEK",
  "MASTERY",
  "HYBRID",
  "SPECIAL",
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
};

export function AchievementsRoom() {
  const { stats, isLoading } = useProgress();
  const { user } = useAuth();
  const [unlockedAchievements, setUnlockedAchievements] = useState<Map<string, string>>(new Map());
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const achievementsByGuild = useMemo(() => getAchievementsByGuild(), []);

  useEffect(() => {
    if (isLoading || !user || !stats) return;

    const syncAchievements = async () => {
      try {

        
        const totalActiveDays = await getDbTotalActiveDays(user.id);
        const dbUnlocked = await getDbUnlocked(user.id);

        // Hard Reset: If DB is completely empty but LocalStorage has data, wipe LocalStorage
        if (
          totalActiveDays === 0 &&
          dbUnlocked.length === 0 &&
          stats.completedVideos === 0
        ) {
          if (typeof window !== "undefined") {
            const keysToClear = [
              "unlocked-achievements",
              "achievement-session",
              "achievement-celebration-queue",
              "user-streak-data",
            ];
            keysToClear.forEach((k) => localStorage.removeItem(k));
          }
        }

        // Ghost Data Check (Simplified)
        let sessionVideos = 0;
        try {
          const sessionData = JSON.parse(sessionStorage.getItem("achievement-session") || '{"videosCompleted": 0}');
          sessionVideos = sessionData.videosCompleted || 0;
        } catch {
          // ignore error
        }

        if (
          totalActiveDays === 0 &&
          stats.completedVideos === 0 &&
          sessionVideos > 0 &&
          dbUnlocked.length === 0
        ) {
          console.warn("Detected stale session data. Resetting.");
          sessionVideos = 0;
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("achievement-session");
          }
        }

        const activityLog = {
          currentStreak: stats.streak || 0,
          totalActiveDays: totalActiveDays,
          dailyVideosCompleted: sessionVideos,
          // Default values for new RPG stats (these should ideally come from backend/stats)
          honestyUsageCount: 0,
          firstTimePerfectCount: 0,
          debtClearedInSession: false,
          consecutiveCorrectStreak: 0,
          weeklyStudyDays: 0,
          masteredTopicsCount: 0,
        };

        const currentlyEligible = calculateAchievements(stats, activityLog);

        const newUnlocks: string[] = [];
        const currentIds = new Set(dbUnlocked.map((a: UnlockedAchievement) => a.id));
        for (const id of currentlyEligible) {
          if (!currentIds.has(id)) {
            newUnlocks.push(id);
          }
        }

        if (newUnlocks.length > 0) {
          for (const id of newUnlocks) {
            await unlockDb(user.id, id);
            // addToCelebrationQueue(id); // useCelebration hook will pick this up from DB
          }
          // Refresh after unlocking
          const updatedDbUnlocked = await getDbUnlocked(user.id);
          setUnlockedAchievements(new Map(updatedDbUnlocked.map((a: UnlockedAchievement) => [a.id, a.unlockedAt])));
        } else {
          setUnlockedAchievements(new Map(dbUnlocked.map((a: UnlockedAchievement) => [a.id, a.unlockedAt])));
        }
      } catch (error) {
        console.error("Bilgelik Arşivi senkronizasyon hatası:", error);
      }
    };

    syncAchievements();
  }, [stats, isLoading, user]);

  const handleSealClick = useCallback((achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setIsModalOpen(true);
  }, []);

  const totalAchievements = ACHIEVEMENTS.length;
  const unlockedCount = unlockedAchievements.size;
  const completionRate = Math.round((unlockedCount / totalAchievements) * 100);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Page Header */}
      <div className="mb-12 max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Library className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1
                className="text-2xl md:text-3xl font-bold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Bilgelik Arşivi
              </h1>
              <p className="text-muted-foreground text-sm">
                "Gerçek mühürler kağıda değil, zihne vurulur."
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:block text-right">
              <div className="text-xs text-foreground uppercase tracking-widest mb-1">
                Genel Aydınlanma
              </div>
              <div className="h-2 w-32 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-1000"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card border border-border">
              <div className="p-2 rounded-lg bg-primary/10">
                <Scroll className="w-5 h-5 text-primary" />
              </div>
              <div className="text-right">
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
          </div>
        </motion.div>
      </div>

      {/* Lonca Bölümleri */}
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-16">
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
                    boxShadow:
                      guildId === "HYBRID" ? `0 0 15px ${guild.color}` : "none",
                  }}
                />
                <div>
                  <h2 className={`text-xl font-bold flex items-center gap-3`}>
                    {/* İsim */}
                    <span
                      className={guildId === "HYBRID" ? "text-primary" : ""}
                    >
                      {guild.name}
                    </span>

                    {/* Dinamik İkon (Lonca Rengiyle) */}
                    <span
                      style={{
                        color: guildId === "HYBRID" ? undefined : guild.color,
                      }}
                      className={guildId === "HYBRID" ? "text-primary" : ""}
                    >
                      {GUILD_ICONS[guildId]}
                    </span>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {guild.description}
                  </p>
                </div>
              </div>

              {/* Mühür Izgarası */}
              <div
                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 ${
                  guildId === "HYBRID"
                    ? "p-6 rounded-3xl bg-primary/3 border border-primary/10 shadow-inner"
                    : ""
                }`}
              >
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
          selectedAchievement ? unlockedAchievements.has(selectedAchievement.id) : false
        }
        unlockedAt={
            selectedAchievement ? unlockedAchievements.get(selectedAchievement.id) : null
        }
      />
    </div>
  );
}
