'use client';

import React, { useMemo } from 'react';
import {
  Sparkles,
  Trophy,
  Lock,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/shared/lib/core/utils';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { RANKS } from '@/features/achievements';

interface TitleRoadmapProps {
  watchedVideos: number;
  requiredVideos: number;
}

export default function TitleRoadmap({
  watchedVideos,
  requiredVideos,
}: TitleRoadmapProps) {
  const milestones = useMemo(() => {
    const sortedRanks = [...RANKS].sort(
      (a, b) => a.minPercentage - b.minPercentage
    );
    return sortedRanks.map((rank, index) => ({
      id: rank.id,
      title: rank.name,
      threshold: rank.minPercentage,
      motto: rank.motto,
      imagePath: `/ranks/rank${index + 1}.webp`,
    }));
  }, []);

  const progress =
    requiredVideos > 0
      ? Math.min(Math.round((watchedVideos / requiredVideos) * 100), 100)
      : 0;

  let currentRankIndex = milestones.length - 1;
  for (let i = 0; i < milestones.length - 1; i++) {
    if (
      progress >= milestones[i].threshold &&
      progress < milestones[i + 1].threshold
    ) {
      currentRankIndex = i;
      break;
    }
  }

  const currentMilestone = milestones[currentRankIndex];
  const nextMilestone = milestones[currentRankIndex + 1];

  // const visualProgress = useMemo(() => { ... }); // REMOVED unused visualProgress

  return (
    <Card className="mx-auto w-full max-w-4xl border-primary/10 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden relative ring-1 ring-border/50">
      {/* Arka Plan Süslemeleri - Daha hafif */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header: Kompaktlaştırıldı */}
      <CardHeader className="relative flex flex-row items-center justify-between py-4 px-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl ring-1 ring-primary/20">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">
              Unvan Yolculuğu
            </CardTitle>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              Seviye:{' '}
              <span className="text-primary">{currentMilestone.title}</span>
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-1 bg-muted/40 px-3 py-1 rounded-xl border border-border/50">
          <span className="text-2xl font-black font-mono text-primary leading-none">
            {progress}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground">%</span>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6 space-y-6">
        {/* İlerleme Çubuğu: Dengeli yükseklik */}
        <div className="relative mx-4 mb-10 mt-2">
          <div className="h-2.5 bg-muted/60 rounded-full overflow-hidden ring-1 ring-border/10 shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-primary shadow-[0_0_15px_var(--primary)]"
            />
          </div>

          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0">
            {/* Fixed Ticks at 0, 25, 50, 75, 100 */}
            {[0, 25, 50, 75, 100].map((tickValue) => {
              const isPassed = progress >= tickValue;
              const positionLeft = tickValue; // 0 to 100 mapping directly to percentage left

              return (
                <div
                  key={tickValue}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `${positionLeft}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full border-4 transition-all duration-500 flex items-center justify-center z-10 bg-background',
                      isPassed
                        ? 'border-primary text-primary'
                        : 'border-white/20 text-muted-foreground'
                    )}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
                    )}
                  </div>
                  <span className="absolute top-7 text-[10.5px] font-black font-foreground font-mono">
                    %{tickValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rütbe Grid: 4'lü yapı, optimize boyutlar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {milestones.map((milestone, index) => {
            const isCompleted = progress >= milestone.threshold;
            const isCurrent = index === currentRankIndex;
            const isLocked = !isCompleted && !isCurrent;

            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'relative flex flex-col items-center p-3 rounded-2xl border transition-all duration-300',
                  isCurrent
                    ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20 shadow-lg'
                    : 'bg-card/50 border-border/40'
                )}
              >
                {isLocked && (
                  <Lock className="absolute top-3 right-3 w-3 h-3 text-muted-foreground/40" />
                )}

                {/* Görsel: Ne devasa ne minik */}
                <div className="relative w-24 h-24 mb-2 transition-transform duration-500 group-hover:scale-105">
                  <img
                    src={milestone.imagePath}
                    alt={milestone.title}
                    className={cn(
                      'w-full h-full object-contain ',
                      isLocked && 'grayscale opacity-60'
                    )}
                  />
                  {isCurrent && (
                    <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full -z-10 animate-pulse" />
                  )}
                </div>

                <div className="text-center">
                  <h3
                    className={cn(
                      'text-sm font-bold truncate px-1',
                      isCurrent ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {milestone.title}
                  </h3>

                  <p
                    className={cn(
                      'text-[12px] leading-tight mt-1 px-1',
                      isCurrent ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    "{milestone.motto}"
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer: Kompakt ve Bilgilendirici */}
        <div className="pt-2">
          {nextMilestone ? (
            <div className="bg-muted/30 rounded-xl p-3 flex items-center justify-between border border-border/30">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary/70" />
                <span className="text-xs font-semibold text-muted-foreground">
                  Sıradaki:{' '}
                  <span className="text-foreground">{nextMilestone.title}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                  %{nextMilestone.threshold} Gerekiyor
                </span>
                <ChevronRight className="w-4 h-4 text-primary/40" />
              </div>
            </div>
          ) : (
            <div className="bg-primary/10 rounded-xl p-3 text-center border border-primary/20">
              <span className="text-xs font-bold text-primary flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" /> Maksimum Seviyeye Ulaşıldı!
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
