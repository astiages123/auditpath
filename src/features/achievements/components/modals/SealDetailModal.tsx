import { Calendar, Award } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  GUILDS,
  getRequirementDescription,
} from '@/features/achievements/logic/achievementsData';
import { formatDisplayDate } from '@/utils/dateUtils';
import type { Achievement } from '@/features/achievements/types/achievementsTypes';

interface SealDetailModalProps {
  achievement: Achievement | null;
  isOpen: boolean;
  onClose: () => void;
  isUnlocked: boolean;
  unlockedAt?: string | null;
}

/**
 * Helper to format the achievement unlock date.
 */
const formatDate = (dateStr: string): string => {
  return formatDisplayDate(dateStr, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * SealDetailModal Component
 * Displays the detailed view of a specific achievement badge (seal),
 * including its motto, unlocking requirements, and unlock date.
 */
export function SealDetailModal({
  achievement,
  isOpen,
  onClose,
  isUnlocked,
  unlockedAt,
}: SealDetailModalProps) {
  if (!achievement) return null;

  const guild = GUILDS[achievement.guild];
  const unlockDate = isUnlocked ? unlockedAt : null;
  const handleOpenChange = (isDialogOpen: boolean) => {
    if (!isDialogOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border p-0 overflow-hidden">
        {/* Header - Guild-themed background gradient */}
        <div
          className="px-6 pt-6 pb-4 text-center"
          style={{
            background: `linear-gradient(to bottom, color-mix(in oklch, ${guild.color} 12%, transparent), transparent)`,
          }}
        >
          <div
            className="inline-flex mx-auto mb-3 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `color-mix(in oklch, ${guild.color} 20%, transparent)`,
              color: guild.color,
            }}
          >
            {guild.name}
          </div>

          <DialogTitle
            className="text-lg text-center leading-snug"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {achievement.title}
          </DialogTitle>
        </div>

        {/* Seal Image */}
        <div className="flex justify-center">
          <div className="relative w-32 h-32">
            <img
              src={achievement.imagePath}
              alt={achievement.title}
              className={`object-contain w-full h-full ${
                isUnlocked ? 'seal-unlocked seal-glow' : 'seal-locked'
              }`}
            />
          </div>
        </div>

        {/* Footer info - Motto, Requirement, Date */}
        <div className="px-6 space-y-3">
          {/* Requirement */}
          <DialogDescription className="text-center text-sm text-foreground">
            {getRequirementDescription(achievement.requirement)}
          </DialogDescription>

          {/* Motto */}
          <div className="flex justify-center">
            <blockquote className="w-fit italic text-foreground/80 border-l-2 border-primary/40 pl-3 text-sm leading-relaxed text-center">
              &ldquo;{achievement.motto}&rdquo;
            </blockquote>
          </div>

          {/* Status/Date */}
          <div className="py-5 border-t border-border/40">
            {isUnlocked && unlockDate ? (
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Kazanıldı: {formatDate(unlockDate)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Award className="w-4 h-4 shrink-0" />
                <span>Henüz kazanılmadı</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
