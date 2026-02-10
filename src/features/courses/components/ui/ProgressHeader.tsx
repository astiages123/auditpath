'use client';

import {
  Clock,
  TrendingUp,
  Calendar,
  Flame,
  CalendarDays,
  Target,
  ChevronRight,
} from 'lucide-react';
import { useProgress } from '@/shared/hooks/use-progress';
import { useState, useMemo, useSyncExternalStore } from 'react';
import { RANKS, type Rank } from '@/shared/lib/core/client-db';
import { JourneyModal } from '../modals/JourneyModal';
import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/core/utils';
import { formatDurationShort } from '@/shared/lib/utils/formatters';

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
  const { stats, streak: contextStreak } = useProgress();

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

  // Schedule mapping
  const schedule = [
    'Muhasebe ve Maliye', // 0 Sunday
    'Ekonomi', // 1 Monday
    'Hukuk', // 2 Tuesday
    'Ekonomi', // 3 Wednesday
    'Hukuk', // 4 Thursday
    'Genel Yetenek ve İngilizce', // 5 Friday
    'Muhasebe ve Maliye', // 6 Saturday
  ];

  const today = new Date();
  const todaysSubject = schedule[today.getDay()];

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
      const currentThreshold = currentRank.minPercentage;
      const nextThreshold = nextRank.minPercentage;
      const thresholdDiff = nextThreshold - currentThreshold;

      if (thresholdDiff > 0) {
        displayRankProgress = Math.round(
          ((displayPercentage - currentThreshold) / thresholdDiff) * 100
        );
      } else {
        displayRankProgress = 100;
      }
      displayRankProgress = Math.min(100, Math.max(0, displayRankProgress));
    }
  }

  // Calculate estimated days strictly until NEXT RANK based on real daily average
  const displayEstimatedDays = useMemo(() => {
    if (!isHydrated || !stats || !nextRank || displayTotalHours <= 0) {
      return initialEstimatedDays;
    }

    const targetThreshold = nextRank.minPercentage ?? 0;
    const targetHours = (displayTotalHours * targetThreshold) / 100;
    const hoursRemaining = Math.max(0, targetHours - displayCompletedHours);

    const dailyRate =
      stats.dailyAverage && stats.dailyAverage > 0 ? stats.dailyAverage : 2;

    return Math.ceil(hoursRemaining / dailyRate);
  }, [
    isHydrated,
    stats,
    nextRank,
    displayTotalHours,
    displayCompletedHours,
    initialEstimatedDays,
  ]);

  const currentRankImage = useMemo(() => {
    if (!currentRank) return '/ranks/rank1.webp';
    const index = RANKS.findIndex((r) => r.name === currentRank.name);
    return `/ranks/rank${(index >= 0 ? index : 0) + 1}.webp`;
  }, [currentRank]);

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
    >
      {/* Rank Card - Large */}
      <motion.div
        variants={itemVariants}
        className="lg:col-span-2 lg:row-span-2 relative group overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6 shadow-2xl"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <Target className="w-32 h-32" />
        </div>

        <div className="relative h-full flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <img
                  src={currentRankImage}
                  alt={currentRank?.name}
                  className="relative h-20 w-20 object-contain drop-shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-transform group-hover:scale-110 duration-500"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
                  Mevcut Seviye
                </p>
                <h3
                  className={cn(
                    'text-2xl font-black tracking-tight',
                    currentRank?.color || 'text-white'
                  )}
                >
                  {currentRank?.name || 'Hiçlikten Yeni Doğan'}
                </h3>
              </div>
            </div>

            <button
              onClick={() => setJourneyOpen(true)}
              className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-2"
            >
              Yolculuğum <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <span className="text-sm font-medium text-white/90">
                  Unvan İlerlemesi
                </span>
                <p className="text-xs text-muted-foreground">
                  {nextRank
                    ? `${nextRank.name} seviyesine ulaşmak için %${100 - displayRankProgress} kaldı`
                    : 'En üst seviyedesiniz!'}
                </p>
              </div>
              <span className="text-xl font-bold text-white tracking-tighter">
                {displayRankProgress}%
              </span>
            </div>
            <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${displayRankProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="absolute h-full bg-linear-to-r from-primary via-primary/80 to-primary rounded-full"
              />
            </div>
          </div>

          {nextRank && (
            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Tahmini Varış:{' '}
                  <span className="text-white font-medium">
                    {displayEstimatedDays} gün
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span>Sonraki:</span>
                <span className="text-primary font-bold uppercase tracking-wider">
                  {nextRank.name}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Streak Card */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-linear-to-br from-orange-500/10 via-zinc-900 to-zinc-900 p-5 group"
      >
        <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <Flame className="w-24 h-24 text-orange-500" />
        </div>
        <div className="relative flex flex-col justify-between h-full">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            </div>
            <span className="text-xs font-semibold text-orange-500/90 uppercase tracking-wider">
              Günlük Seri
            </span>
          </div>
          <div className="mt-2">
            <span className="text-4xl font-black text-white">
              {isHydrated ? contextStreak : 0}
            </span>
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              Gün
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            İstikrarını koruyorsun! 🔥
          </p>
        </div>
      </motion.div>

      {/* Overall Progress Card */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-zinc-900 to-zinc-900 p-5 group"
      >
        <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <TrendingUp className="w-24 h-24 text-emerald-500" />
        </div>
        <div className="relative flex flex-col justify-between h-full">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-xs font-semibold text-emerald-500/90 uppercase tracking-wider">
              Genel İlerleme
            </span>
          </div>
          <div className="mt-2">
            <span className="text-4xl font-black text-white">
              %{displayPercentage}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Müfredat tamamlanma oranı
          </p>
        </div>
      </motion.div>

      {/* Program Card */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-linear-to-br from-blue-500/10 via-zinc-900 to-zinc-900 p-5 group"
      >
        <div className="relative flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <CalendarDays className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Günün Odağı
            </span>
          </div>
          <div>
            <h4 className="text-lg font-bold text-white leading-tight line-clamp-2">
              {todaysSubject}
            </h4>
            <p className="text-[10px] text-muted-foreground mt-1">
              Sınav takvimine göre bugün
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Card - Combined */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-linear-to-br from-purple-500/10 via-zinc-900 to-zinc-900 p-5 group"
      >
        <div className="relative flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Zaman ve Video
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">Süre</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-white">
                  {formatDurationShort(displayCompletedHours)}
                </span>
                <span className="text-[8px] text-muted-foreground">
                  /{formatDurationShort(displayTotalHours)}
                </span>
              </div>
            </div>
            <div className="space-y-0.5 border-l border-white/5 pl-2">
              <p className="text-[10px] text-muted-foreground">Video</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-white">
                  {displayCompletedVideos}
                </span>
                <span className="text-[8px] text-muted-foreground">
                  /{displayTotalVideos}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <JourneyModal open={journeyOpen} onOpenChange={setJourneyOpen} />
    </motion.div>
  );
}
