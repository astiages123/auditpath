import { Clock, TrendingUp, Flame, CalendarDays } from 'lucide-react';
import { useProgress } from '@/shared/hooks/useProgress';
import {
  calculateRankProgress,
  calculateEstimatedDaysToNextRank,
} from '../logic/coursesLogic';
import { useState, useSyncExternalStore } from 'react';
import { RANKS } from '@/features/achievements/utils/constants';
import type { Rank } from '@/types/auth';
import { JourneyModal } from './JourneyModal';
import { motion } from 'framer-motion';
import { formatDurationShort } from '@/utils/formatters';
import { WEEKLY_SCHEDULE } from '@/features/courses/utils/coursesConfig';
import { Skeleton } from '@/components/ui/skeleton';
import { RankCard } from './RankCard';
import { ProgressStatCard } from './ProgressStatCard';

// Local helper for legacy props, but prefer importing shared type
interface RankInfo extends Rank {
  threshold?: number; // legacy compat
}

interface ProgressHeaderProps {
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
  const { stats, streak: contextStreak, isLoading } = useProgress();

  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [journeyOpen, setJourneyOpen] = useState(false);

  // Use context stats if hydrated, otherwise use props
  const displayCompletedVideos =
    isHydrated && stats ? stats.completedVideos : initialCompletedVideos;
  const displayTotalVideos =
    initialTotalVideos || (isHydrated && stats ? stats.totalVideos : 0);
  const displayCompletedHours =
    isHydrated && stats ? stats.completedHours : initialCompletedHours;
  const displayTotalHours =
    initialTotalHours || (isHydrated && stats ? stats.totalHours : 0);

  // Schedule mapping from config
  const today = new Date();
  const dayIndex = today.getDay(); // 0 = Sunday

  // Find schedule item for today
  const todaySchedule = WEEKLY_SCHEDULE.find((item) =>
    item.matchDays.includes(dayIndex)
  );
  const todaysSubject = todaySchedule
    ? todaySchedule.subject
    : 'Serbest Çalışma';

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
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
    >
      <RankCard
        currentRank={currentRank}
        nextRank={nextRank}
        rankProgress={displayRankProgress}
        currentRankImage={currentRankImage}
        displayEstimatedDays={displayEstimatedDays}
        showSkeleton={showSkeleton}
        onOpenJourney={() => setJourneyOpen(true)}
        variants={itemVariants}
      />

      <ProgressStatCard
        icon={Flame}
        bgIcon={Flame}
        label="Günlük Seri"
        value={isHydrated ? contextStreak : 0}
        suffix="Gün"
        subText="İstikrarını koruyorsun! 🔥"
        colorClass="text-orange-500"
        showSkeleton={showSkeleton}
        variants={itemVariants}
      />

      <ProgressStatCard
        icon={TrendingUp}
        bgIcon={TrendingUp}
        label="Genel İlerleme"
        value={`%${displayPercentage}`}
        subText="Müfredat tamamlanma oranı"
        colorClass="text-emerald-500"
        showSkeleton={showSkeleton}
        variants={itemVariants}
      />

      <ProgressStatCard
        icon={CalendarDays}
        bgIcon={CalendarDays}
        label="Günün Odağı"
        value={todaysSubject}
        subText="Sınav takvimine göre bugün"
        colorClass="text-blue-400"
        showSkeleton={showSkeleton}
        variants={itemVariants}
      />

      <ProgressStatCard
        icon={Clock}
        bgIcon={Clock}
        label="Zaman ve Video"
        value=""
        colorClass="text-purple-400"
        showSkeleton={showSkeleton}
        variants={itemVariants}
      >
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="space-y-0.5">
            <p className="text-sm text-muted-foreground">Süre</p>
            {showSkeleton ? (
              <Skeleton className="h-5 w-16 bg-zinc-800" />
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-white">
                  {formatDurationShort(displayCompletedHours)}
                </span>
                <span className="text-xs text-muted-foreground">
                  /{formatDurationShort(displayTotalHours)}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-0.5 border-l border-white/5 pl-2">
            <p className="text-sm text-muted-foreground">Video</p>
            {showSkeleton ? (
              <Skeleton className="h-5 w-16 bg-zinc-800" />
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-white">
                  {displayCompletedVideos}
                </span>
                <span className="text-xs text-muted-foreground">
                  /{displayTotalVideos}
                </span>
              </div>
            )}
          </div>
        </div>
      </ProgressStatCard>

      <JourneyModal open={journeyOpen} onOpenChange={setJourneyOpen} />
    </motion.div>
  );
}
