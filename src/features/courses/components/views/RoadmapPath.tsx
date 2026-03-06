import type { FC } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';

export interface Milestone {
  id: string;
  title: string;
  threshold: number;
  motto: string;
  color: string;
  imagePath: string;
}

export interface RoadmapPathProps {
  milestones: Milestone[];
  progress: number;
  currentRankIndex: number;
}

/**
 * Renders a visual path connecting multiple milestones based on user progress.
 */
export const RoadmapPath: FC<RoadmapPathProps> = ({
  milestones,
  progress,
  currentRankIndex,
}) => {
  return (
    <div className="relative py-8">
      {/* Path Header */}
      <div className="flex flex-col items-center mb-10 text-center">
        <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Gelişim Yolculuğu
        </span>
        <h3 className="text-lg font-black text-foreground">
          Yükseliş Haritası
        </h3>
      </div>

      {/* Desktop: Alternating Layout */}
      <div className="hidden lg:block relative px-4">
        {/* Vertical Line */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-border" />

        {/* Progress Line */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 bg-primary transition-all"
          style={{
            height: `${(currentRankIndex / (milestones.length - 1)) * 100}%`,
          }}
        />

        <div className="relative space-y-8 max-w-4xl mx-auto">
          {milestones.map((milestone, index) => {
            const isCompleted =
              progress >= milestone.threshold && index < currentRankIndex;
            const isCurrent = index === currentRankIndex;
            const isLocked = index > currentRankIndex;
            const isEven = index % 2 === 0;

            return (
              <div
                key={milestone.id}
                className={cn(
                  'relative flex items-center gap-8',
                  isEven ? 'flex-row' : 'flex-row-reverse'
                )}
              >
                {/* Card Side */}
                <div
                  className={cn(
                    'w-1/2 flex',
                    isEven ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'relative flex flex-row items-center gap-4 w-full max-w-[360px] p-4 rounded-xl border transition-colors',
                      isCurrent
                        ? 'border-primary bg-primary/[0.05]'
                        : isCompleted
                          ? 'border-border bg-card'
                          : 'border-border/30 bg-card/40'
                    )}
                  >
                    {/* Lock Icon - Top Right */}
                    {isLocked && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-border">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}

                    {/* Milestone Image */}
                    <div className="flex-shrink-0">
                      <div
                        className={cn(
                          'size-16 rounded-lg flex items-center justify-center',
                          isLocked && 'opacity-70'
                        )}
                      >
                        <img
                          src={milestone.imagePath}
                          alt={milestone.title}
                          className="size-16 object-contain"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4
                          className={cn(
                            'text-sm font-bold truncate',
                            isCurrent ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {milestone.title}
                        </h4>
                        <span className="text-xs font-mono font-bold text-muted-foreground shrink-0">
                          {milestone.threshold}-
                          {milestones[index + 1]?.threshold || 100}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        "{milestone.motto}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Center Node */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full border-2 z-10',
                      isCurrent
                        ? 'bg-accent border-accent'
                        : isCompleted
                          ? 'bg-primary border-primary'
                          : 'bg-border border-border'
                    )}
                  />
                </div>

                {/* Empty Side */}
                <div className="w-1/2" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Vertical List */}
      <div className="lg:hidden space-y-4 px-4">
        {milestones.map((milestone, index) => {
          const isCompleted =
            progress >= milestone.threshold && index < currentRankIndex;
          const isCurrent = index === currentRankIndex;
          const isLocked = index > currentRankIndex;
          const isLast = index === milestones.length - 1;

          return (
            <div key={milestone.id} className="flex gap-4 relative">
              {/* Connector */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-5 top-10 bottom-0 w-0.5 -translate-x-1/2',
                    isCompleted ? 'bg-primary' : 'bg-border/30'
                  )}
                />
              )}

              {/* Icon */}
              <div className="relative flex-shrink-0 z-10">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg border-2 flex items-center justify-center',
                    isCurrent
                      ? 'border-accent bg-accent/10'
                      : isCompleted
                        ? 'border-primary bg-primary/5'
                        : 'border-border/40 bg-muted/20'
                  )}
                >
                  <img
                    src={milestone.imagePath}
                    alt={milestone.title}
                    className={cn(
                      'w-7 h-7 object-contain',
                      isLocked && 'opacity-70'
                    )}
                  />
                </div>
                {isLocked && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-muted flex items-center justify-center border border-border">
                    <Lock className="w-2 h-2 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  'flex-1 p-3 rounded-lg border transition-colors',
                  isCurrent
                    ? 'bg-accent/[0.03] border-accent/20'
                    : isCompleted
                      ? 'bg-card border-border/50'
                      : 'bg-muted/5 border-transparent'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4
                    className={cn(
                      'font-bold text-sm',
                      isCurrent
                        ? 'text-accent'
                        : isCompleted
                          ? 'text-foreground'
                          : 'text-muted-foreground/60'
                    )}
                  >
                    {milestone.title}
                  </h4>
                  <span className="text-[9px] font-mono font-bold text-muted-foreground/40">
                    {milestone.threshold}-
                    {milestones[index + 1]?.threshold || 100}%
                  </span>
                </div>
                <p
                  className={cn(
                    'text-xs leading-tight line-clamp-2',
                    isCurrent
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/40'
                  )}
                >
                  "{milestone.motto}"
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
