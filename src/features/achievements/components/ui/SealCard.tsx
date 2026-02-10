'use client';

// import Image from "next/image";
import { Lock } from 'lucide-react';
import {
  Achievement,
  getRequirementDescription,
  GUILDS,
} from '@/features/achievements/lib/achievements';

interface SealCardProps {
  achievement: Achievement;
  isUnlocked: boolean;
  onClick: () => void;
}

export function SealCard({ achievement, isUnlocked, onClick }: SealCardProps) {
  const guild = GUILDS[achievement.guild];

  return (
    <button
      onClick={onClick}
      className="seal-card relative group flex flex-col items-center p-4 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`${achievement.title} - ${isUnlocked ? 'Açık' : 'Kilitli'}`}
    >
      {/* Seal Image */}
      <div className="relative w-28 h-28 mb-3">
        <img
          src={achievement.imagePath}
          alt={achievement.title}
          className={`object-contain transition-all duration-300 w-full h-full ${
            isUnlocked ? 'seal-unlocked seal-glow' : 'seal-locked'
          }`}
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
      <h3
        className={`text-sm font-semibold text-center transition-colors ${
          isUnlocked ? 'text-foreground' : 'text-muted-foreground'
        }`}
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {achievement.title}
      </h3>

      {/* Requirement Tooltip - shown on hover for locked */}
      {!isUnlocked && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-popover border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 min-w-max">
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
    </button>
  );
}
