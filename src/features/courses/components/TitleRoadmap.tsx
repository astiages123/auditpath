import {
  Sparkles,
  Trophy,
  CheckCircle2,
  Lock,
  ChevronRight,
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
    <Card className="mx-auto w-full border-none bg-transparent shadow-none overflow-visible relative">
      {/* Header: Minimal */}
      <CardHeader className="relative flex flex-row items-center justify-between pt-2 pb-4 px-0">
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
        {/* İlerleme Çubuğu: Minimal */}
        <div className="relative mx-4 mb-10 mt-0">
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-accent"
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
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
                    )}
                  </div>
                  <span className="absolute top-7 text-[10.5px] font-medium text-muted-foreground font-mono">
                    %{tickValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rütbe Grid: 4'lü yapı, optimize boyutlar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
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
                  'relative flex flex-col items-center p-4 rounded-xl border transition-all duration-300',
                  isCurrent
                    ? 'bg-accent/5 border-accent/30 ring-1 ring-accent/20'
                    : 'bg-card/50 border-border/40'
                )}
              >
                {isLocked && (
                  <Lock className="absolute top-3 right-3 w-3 h-3 text-muted-foreground/40" />
                )}

                {/* Görsel: Minimal */}
                <div className="relative w-28 h-28 mb-3">
                  <img
                    src={milestone.imagePath}
                    alt={milestone.title}
                    className={cn(
                      'w-full h-full object-contain',
                      isLocked && 'grayscale opacity-70'
                    )}
                  />
                </div>

                <div className="text-center">
                  <h3
                    className={cn(
                      'text-sm font-semibold truncate px-1',
                      isCurrent ? 'text-foreground' : 'text-foreground'
                    )}
                  >
                    {milestone.title}
                  </h3>

                  <p
                    className={cn(
                      'text-[12px] leading-tight mt-1 px-1',
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
            <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between border border-border">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-accent/70" />
                <span className="text-xs font-medium text-muted-foreground">
                  Sıradaki:{' '}
                  <span className="text-foreground">{nextMilestone.title}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded">
                  %{nextMilestone.threshold} Gerekiyor
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ) : (
            <div className="bg-accent/10 rounded-lg p-3 text-center border border-accent/20">
              <span className="text-xs font-medium text-accent flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" /> Maksimum Seviyeye Ulaşıldı!
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
