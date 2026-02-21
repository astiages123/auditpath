import { ChevronRight, Target, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/stringHelpers';
import { Skeleton } from '@/components/ui/skeleton';
import { type Rank } from '@/types/auth';
import type { Variants } from 'framer-motion';

interface RankInfo extends Rank {
  threshold?: number;
}

interface RankCardProps {
  currentRank: RankInfo | null;
  nextRank: RankInfo | null;
  rankProgress: number;
  currentRankImage: string;
  displayEstimatedDays: number;
  showSkeleton: boolean;
  onOpenJourney: () => void;
  variants: Variants;
}

export function RankCard({
  currentRank,
  nextRank,
  rankProgress,
  currentRankImage,
  displayEstimatedDays,
  showSkeleton,
  onOpenJourney,
  variants,
}: RankCardProps) {
  return (
    <motion.div
      variants={variants}
      className="lg:col-span-2 lg:row-span-2 relative group overflow-hidden rounded-3xl border border-border-subtle bg-linear-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6 shadow-2xl"
    >
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
        <Target className="w-32 h-32" />
      </div>

      <div className="relative h-full flex flex-col justify-between space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              {showSkeleton ? (
                <Skeleton className="h-20 w-20 rounded-full bg-surface-hover" />
              ) : (
                <img
                  src={currentRankImage}
                  alt={currentRank?.name}
                  className="relative h-20 w-20 object-contain drop-shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-transform group-hover:scale-110 duration-500"
                />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
                Mevcut Seviye
              </p>
              {showSkeleton ? (
                <Skeleton className="h-8 w-48 bg-surface-hover" />
              ) : (
                <h3
                  className={cn(
                    'text-2xl font-black tracking-tight',
                    currentRank?.color || 'text-white'
                  )}
                >
                  {currentRank?.name || 'Hiçlikten Yeni Doğan'}
                </h3>
              )}
            </div>
          </div>

          <button
            onClick={onOpenJourney}
            className="px-4 py-2 rounded-full bg-surface hover:bg-surface-hover border border-border-subtle text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-2"
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
              {showSkeleton ? (
                <Skeleton className="h-4 w-64 bg-surface-hover" />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {nextRank
                    ? `${nextRank.name} seviyesine ulaşmak için %${100 - rankProgress} kaldı`
                    : 'En üst seviyedesiniz!'}
                </p>
              )}
            </div>
            {showSkeleton ? (
              <Skeleton className="h-8 w-16 bg-surface-hover" />
            ) : (
              <span className="text-xl font-bold text-white tracking-tighter">
                {rankProgress}%
              </span>
            )}
          </div>
          <div className="relative h-3 w-full bg-white/10 rounded-full overflow-hidden">
            {showSkeleton ? (
              <Skeleton className="h-full w-full bg-surface-hover" />
            ) : (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${rankProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="absolute h-full bg-linear-to-r from-primary via-primary/80 to-primary rounded-full"
              />
            )}
          </div>
        </div>

        {!showSkeleton && nextRank && (
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
  );
}
