import { FC } from 'react';
import { Sparkles, Play, TrendingUp } from 'lucide-react';

interface RoadmapHeroProps {
  currentMilestone: {
    title: string;
    motto: string;
    imagePath: string;
  };
  nextMilestone?: {
    title: string;
    motto: string;
    imagePath: string;
  };
  _toNext: number;
  watchedVideos: number;
  requiredVideos: number;
  progress: number;
  estimatedDays?: number;
}

export const RoadmapHero: FC<RoadmapHeroProps> = ({
  currentMilestone,
  nextMilestone,
  _toNext,
  watchedVideos,
  requiredVideos,
  progress,
  estimatedDays,
}) => {
  return (
    <div className="rounded-xl border border-border bg-card/20 px-5 py-3 mb-4">
      <div className="flex items-center gap-6">
        {/* Sol - Rank Info + Kaldı */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <img
            src={currentMilestone.imagePath}
            alt={currentMilestone.title}
            className="size-25 object-contain shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-normal text-amber-600">
                Mevcut
              </span>
            </div>
            <p className="text-xl font-black text-foreground leading-tight">
              {currentMilestone.title}
            </p>
            {nextMilestone && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-muted-foreground">
                  Hedef:{' '}
                  <span className="font-semibold text-foreground">
                    {nextMilestone.title}
                  </span>
                </span>
              </div>
            )}
            {!nextMilestone && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 rounded-lg border border-amber-500/30 mt-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-base font-black text-amber-600">
                  Maksimum Seviye
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sağ - Stats */}
        <div className="flex items-center gap-6 shrink-0">
          {/* İlerleme */}
          <div className="flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-primary" />
            <div className="text-center">
              <p className="text-xl font-black text-foreground">%{progress}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Genel İlerleme
              </p>
            </div>
          </div>

          {/* Tamamlanan Video */}
          <div className="flex items-center gap-3">
            <Play className="w-7 h-7 text-accent" />
            <div className="text-center">
              <p className="text-xl font-black text-foreground">
                {watchedVideos}
                <span className="text-sm text-muted-foreground font-medium">
                  /{requiredVideos}
                </span>
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Video
              </p>
            </div>
          </div>

          {/* Kalan Gün */}
          {nextMilestone &&
            estimatedDays !== undefined &&
            estimatedDays > 0 && (
              <div className="flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-amber-500" />
                <div className="text-center">
                  <p className="text-xl font-black text-amber-600">
                    {estimatedDays}g
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    Kalan
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
