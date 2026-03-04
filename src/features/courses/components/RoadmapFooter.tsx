// ===========================
// === IMPORTS ===
// ===========================

import type { FC } from 'react';
import { Trophy, Sparkles } from 'lucide-react';

// ===========================
// === TYPE DEFINITIONS ===
// ===========================

export interface RoadmapFooterProps {
  nextMilestone?: {
    title: string;
    motto: string;
  };
  toNext: number;
}

// ===========================
// === COMPONENT ===
// ===========================

/**
 * Renders the footer of the roadmap, displaying the next milestone
 * and progress remaining, or a completion message if at max rank.
 */
export const RoadmapFooter: FC<RoadmapFooterProps> = ({
  nextMilestone,
  toNext,
}) => {
  return (
    <div>
      {nextMilestone ? (
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4.5 h-4.5 text-accent" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                Sıradaki Durak
              </p>
              <p className="font-bold text-foreground">{nextMilestone.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <div className="text-right">
              <p className="text-xl font-black text-accent leading-none">
                %{toNext}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Kaldı
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
          <div className="inline-flex items-center gap-2 text-amber-600 font-bold">
            <Sparkles className="w-5 h-5" />
            Maksimum Seviyeye Ulaştın!
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      )}
    </div>
  );
};
