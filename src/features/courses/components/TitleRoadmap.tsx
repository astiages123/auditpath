import {
  Sparkles,
  Trophy,
  CheckCircle2,
  Lock,
  StepForward,
} from 'lucide-react';
import { RANKS } from '@/features/achievements/utils/constants';
import { cn } from '@/utils/stringHelpers';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export { RANKS };

interface TitleRoadmapProps {
  watchedVideos: number;
  requiredVideos: number;
}

export default function TitleRoadmap({
  watchedVideos,
  requiredVideos,
}: TitleRoadmapProps) {
  const sortedRanks = [...RANKS].sort(
    (a, b) => a.minPercentage - b.minPercentage
  );
  const milestones = sortedRanks.map((rank, index) => ({
    id: rank.id,
    title: rank.name,
    threshold: rank.minPercentage,
    motto: rank.motto,
    imagePath: `/ranks/rank${index + 1}.webp`,
  }));

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
    <Card className="mx-auto w-full border border-border/60 bg-card/60 backdrop-blur-md shadow-md overflow-visible relative p-5 rounded-xl">
      {/* Header: Minimal */}
      <CardHeader className="relative flex flex-row items-center justify-between pt-0 pb-4 px-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div>
            <CardTitle className="text-lg sm:text-xl font-bold tracking-tight mb-0">
              Unvan Yolculuğu
            </CardTitle>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Seviye:{' '}
              <span className="text-accent">{currentMilestone.title}</span>
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-1 bg-muted px-3 py-1 rounded-lg border border-border/50">
          <span className="text-xl sm:text-2xl font-bold font-mono text-accent leading-none">
            {progress}
          </span>
          <span className="text-[9px] font-medium text-muted-foreground">
            %
          </span>
        </div>
      </CardHeader>

      <CardContent className="px-0 py-0 space-y-6">
        {/* İlerleme Çubuğu: Kontrastlı Gradient */}
        <div className="relative mx-4 mb-7 mt-0">
          <div className="h-3 bg-foreground/10 rounded-full overflow-hidden border border-border/20 shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary via-accent to-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]"
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
                        ? 'border-accent text-accent'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-current opacity-60" />
                    )}
                  </div>
                  <span className="absolute top-7 text-[11px] font-bold text-foreground/80 font-mono">
                    %{tickValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rütbe Grid: 4'lü yapı, optimize boyutlar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-15">
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
                  'relative flex flex-col items-center p-5 rounded-xl border transition-all duration-300',
                  isCurrent
                    ? 'bg-accent/10 border-accent shadow-[0_0_15px_rgba(var(--accent),0.1)] ring-1 ring-accent'
                    : 'bg-card/40 border-border/60 hover:border-border/100'
                )}
              >
                {isLocked && (
                  <Lock className="absolute top-3 right-3 w-4 h-4 text-muted-foreground/40" />
                )}

                {/* Görsel: Optimize boyutu */}
                <div className="relative w-27 h-27 mb-4">
                  <img
                    src={milestone.imagePath}
                    alt={milestone.title}
                    className={cn(
                      'w-full h-full object-contain',
                      isLocked && 'grayscale opacity-60 brightness-75'
                    )}
                  />
                </div>

                <div className="text-center">
                  <h3
                    className={cn(
                      'text-base font-semibold truncate px-1',
                      isCurrent ? 'text-foreground' : 'text-foreground'
                    )}
                  >
                    {milestone.title}
                  </h3>

                  <p
                    className={cn(
                      'text-sm leading-tight mt-2 px-1',
                      'text-muted-foreground'
                    )}
                  >
                    "{milestone.motto}"
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer: Minimal */}
        <div className="pt-2">
          {nextMilestone ? (
            <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between border border-border">
              <div className="flex items-center gap-2">
                <Trophy className="size-6 text-accent/70" />
                <span className="text-sm font-medium text-foreground">
                  Sıradaki:{' '}
                  <span className="text-accent text-sm">
                    {nextMilestone.title}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-accent bg-accent/10 px-2 py-0.5 rounded">
                  %{nextMilestone.threshold} Gerekiyor
                </span>
                <StepForward className="size-6 text-accent" />
              </div>
            </div>
          ) : (
            <div className="bg-accent/10 rounded-lg p-4 text-center border border-accent/20">
              <span className="text-sm font-medium text-accent flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" /> Maksimum Seviyeye Ulaşıldı!
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
