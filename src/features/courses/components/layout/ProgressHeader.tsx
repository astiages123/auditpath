// ===========================
// === IMPORTS ===
// ===========================

import { Clock, TrendingUp, CalendarDays } from 'lucide-react';
import { useProgress } from '@/shared/hooks/useProgress';
import {
  calculateRankProgress,
  calculateEstimatedDaysToNextRank,
} from '@/features/courses/logic/coursesLogic';
import { useSyncExternalStore } from 'react';
import { RANKS } from '@/features/achievements/utils/constants';
import type { Rank } from '@/types/auth';
import { motion } from 'framer-motion';
import { WEEKLY_SCHEDULE } from '@/features/courses/utils/coursesConfig';
import { RankCard } from '@/features/courses/components/cards/RankCard';
import { ProgressStatCard } from '@/features/courses/components/cards/ProgressStatCard';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';

// ===========================
// === TYPE DEFINITIONS ===
// ===========================

import type { RankInfo } from '@/features/courses/types/courseTypes';

export interface ProgressHeaderProps {
  currentRank: RankInfo | null;
  nextRank: RankInfo | null;
  rankProgress: number;
  completedVideos: number;
  totalVideos: number;
  completedHours: number;
  totalHours: number;
  progressPercentage: number;
  estimatedDays: number;
}

// ===========================
// === COMPONENT ===
// ===========================

/**
 * Renders the top dashboard header section containing
 * summary statistics, ranks, and focus metrics.
 */
export function ProgressHeader({
  currentRank: initialCurrentRank,
  nextRank: initialNextRank,
  rankProgress: initialRankProgress,
  completedVideos: initialCompletedVideos,
  totalVideos: initialTotalVideos,
  completedHours: initialCompletedHours,
  totalHours: initialTotalHours,
  progressPercentage: initialProgressPercentage,
  estimatedDays: initialEstimatedDays,
}: ProgressHeaderProps) {
  const { stats, isLoading } = useProgress();

  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const navigate = useNavigate();

  // Use context stats if hydrated, otherwise use props
  const displayCompletedVideos =
    isHydrated && stats ? stats.completedVideos : initialCompletedVideos;
  const displayTotalVideos =
    initialTotalVideos || (isHydrated && stats ? stats.totalVideos : 0);
  const displayCompletedHours =
    isHydrated && stats ? stats.completedHours : initialCompletedHours;
  const displayTotalHours =
    initialTotalHours || (isHydrated && stats ? stats.totalHours : 0);
  const displayCompletedReadings =
    isHydrated && stats ? stats.completedReadings || 0 : 0;
  const displayTotalReadings =
    isHydrated && stats ? stats.totalReadings || 0 : 0;
  const displayCompletedPages =
    isHydrated && stats ? stats.completedPages || 0 : 0;
  const displayTotalPages = isHydrated && stats ? stats.totalPages || 0 : 0;

  // Schedule mapping from config
  const today = new Date();
  const dayIndex = today.getDay(); // 0 = Sunday

  // Find schedule item for today
  const todaySchedule = WEEKLY_SCHEDULE.find((item) =>
    item.matchDays.includes(dayIndex)
  );
  const currentBlock = todaySchedule?.blocks[0];
  const todaysSubject = currentBlock ? currentBlock.subject : 'Günün Dersi';

  // Calculate overall percentage based on HOURS for more accuracy
  const displayPercentage = isHydrated
    ? displayTotalHours > 0
      ? Math.round((displayCompletedHours / displayTotalHours) * 100)
      : 0
    : initialProgressPercentage;

  // Recalculate rank progress
  let displayRankProgress = initialRankProgress;
  let currentRank = initialCurrentRank;
  let nextRank = initialNextRank;

  if (isHydrated && stats && stats.currentRank) {
    currentRank = stats.currentRank as RankInfo;
    nextRank = (stats.nextRank || null) as RankInfo | null;

    if (currentRank && nextRank) {
      displayRankProgress = calculateRankProgress(
        displayPercentage,
        currentRank.minPercentage,
        nextRank.minPercentage
      );
    }
  }

  // Calculate estimated days strictly until NEXT RANK based on real daily average
  const displayEstimatedDays =
    !isHydrated || !stats || !nextRank || displayTotalHours <= 0
      ? initialEstimatedDays
      : calculateEstimatedDaysToNextRank(
          displayTotalHours,
          displayCompletedHours,
          nextRank.minPercentage,
          stats.dailyAverage || 2
        );

  const currentRankImage = (() => {
    if (!currentRank) return '/ranks/rank1.webp';
    const index = RANKS.findIndex((r: Rank) => r.name === currentRank.name);
    return `/ranks/rank${(index >= 0 ? index : 0) + 1}.webp`;
  })();

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  };

  // Helper for loading state
  const showSkeleton = isLoading && !stats;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
    >
      <RankCard
        currentRank={currentRank}
        nextRank={nextRank}
        rankProgress={displayRankProgress}
        currentRankImage={currentRankImage}
        displayEstimatedDays={displayEstimatedDays}
        showSkeleton={showSkeleton}
        onOpenJourney={() => navigate(ROUTES.ROADMAP)}
        variants={itemVariants}
      />

      <ProgressStatCard
        icon={TrendingUp}
        bgIcon={TrendingUp}
        label="Genel İlerleme"
        value={`%${displayPercentage}`}
        subText="Müfredat tamamlanma oranı"
        colorClass="text-accent"
        showSkeleton={showSkeleton}
        variants={itemVariants}
      />

      <ProgressStatCard
        icon={CalendarDays}
        bgIcon={CalendarDays}
        label="Şu Anki Odak"
        value={todaysSubject}
        subText="Günün ana odağı"
        colorClass="text-accent"
        showSkeleton={showSkeleton}
        variants={itemVariants}
      />

      <ProgressStatCard
        icon={Clock}
        bgIcon={Clock}
        label="İlerleme Özeti"
        value=""
        colorClass="text-accent"
        showSkeleton={showSkeleton}
        variants={itemVariants}
        className="sm:col-span-2 lg:col-span-2"
      >
        <div className="grid grid-cols-2 mt-2 pt-1 border-white/10">
          {/* Süre */}
          <div className="flex flex-col items-center justify-center p-2 py-3 border-r border-b border-white/10 gap-1.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center">
              Toplam Süre
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-orange-500 leading-none">
                {displayCompletedHours.toFixed(1).replace('.0', '')} sa
              </span>
              <span className="text-[10px] text-muted-foreground font-medium leading-none whitespace-nowrap">
                /{Math.round(displayTotalHours)} sa
              </span>
            </div>
          </div>

          {/* Video */}
          <div className="flex flex-col items-center justify-center p-2 py-3 border-b border-white/10 gap-1.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center">
              Toplam Video
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-blue-500 leading-none">
                {displayCompletedVideos}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium leading-none whitespace-nowrap">
                /{displayTotalVideos}
              </span>
            </div>
          </div>

          {/* Sayfa */}
          <div className="flex flex-col items-center justify-center p-2 py-3 border-r border-white/10 gap-1.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center">
              Toplam Sayfa
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-purple-500 leading-none">
                {displayCompletedPages}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium leading-none whitespace-nowrap">
                /{displayTotalPages}
              </span>
            </div>
          </div>

          {/* Okuma */}
          <div className="flex flex-col items-center justify-center p-2 py-3 gap-1.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center">
              Toplam Bölüm
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-emerald-500 leading-none">
                {displayCompletedReadings}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium leading-none whitespace-nowrap">
                /{displayTotalReadings}
              </span>
            </div>
          </div>
        </div>
      </ProgressStatCard>
    </motion.div>
  );
}
