import { Lock } from 'lucide-react';
import { GUILDS, getRequirementDescription } from '../logic/achievementsData';
import type { Achievement } from '../types/achievementsTypes';
import { cn } from '@/utils/stringHelpers';
import { Card } from '@/components/ui/card';

interface SealCardProps {
  achievement: Achievement;
  isUnlocked: boolean;
  onClick: () => void;
}

export function SealCard({ achievement, isUnlocked, onClick }: SealCardProps) {
  const guild = GUILDS[achievement.guild];

  const sealTooltipClass = cn(
    'tooltip-float',
    'bottom-full left-1/2 -translate-x-1/2 mb-2 min-w-max'
  );

  const sealImageClass = cn(
    'object-contain transition-all duration-300 w-full h-full',
    isUnlocked ? 'seal-unlocked seal-glow' : 'seal-locked'
  );

  const titleClass = cn(
    'text-sm font-semibold text-center transition-colors',
    isUnlocked ? 'text-foreground' : 'text-muted-foreground'
  );

  const sealCardClass = cn(
    'seal-card relative group flex flex-col items-center',
    'p-4 rounded-2xl cursor-pointer',
    'bg-card border border-border',
    'hover:border-accent/30',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
  );

  return (
    <Card
      variant="glass"
      role="button"
      tabIndex={0}
      onClick={onClick}
      className={sealCardClass}
      aria-label={`${achievement.title} - ${isUnlocked ? 'Açık' : 'Kilitli'}`}
    >
      {/* Seal Image */}
      <div className="relative w-28 h-28 mb-3">
        <img
          src={achievement.imagePath}
          alt={achievement.title}
          className={sealImageClass}
        />

        {/* Lock icon overlay for locked achievements */}
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-background/80 rounded-full p-2">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className={titleClass} style={{ fontFamily: 'var(--font-heading)' }}>
        {achievement.title}
      </h3>

      {/* Requirement Tooltip - shown on hover for locked */}
      {!isUnlocked && (
        <div className={sealTooltipClass}>
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            <span className="font-medium text-foreground">Gereksinim: </span>
            {getRequirementDescription(achievement.requirement)}
          </p>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
        </div>
      )}

      {/* Unlocked indicator glow */}
      {isUnlocked && (
        <div
          className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none"
          style={{ backgroundColor: guild.color }}
        />
      )}
    </Card>
  );
}
