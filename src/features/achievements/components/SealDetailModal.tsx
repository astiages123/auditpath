import { Calendar, Award } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { GUILDS, getRequirementDescription } from '../logic/achievementsData';
import { formatDisplayDate } from '@/utils/dateUtils';
import type { Achievement } from '../types/achievementsTypes';

interface SealDetailModalProps {
  achievement: Achievement | null;
  isOpen: boolean;
  onClose: () => void;
  isUnlocked: boolean;
  unlockedAt?: string | null;
}

const formatDate = (dateStr: string) => {
  return formatDisplayDate(dateStr, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center">
          {/* Guild Badge */}
          <div
            className="mx-auto mb-2 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `color-mix(in oklch, ${guild.color} 20%, transparent)`,
              color: guild.color,
            }}
          >
            {guild.name}
          </div>

          <DialogTitle
            className="text-xl text-center"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {achievement.title}
          </DialogTitle>

          <DialogDescription className="text-center text-muted-foreground">
            {getRequirementDescription(achievement.requirement)}
          </DialogDescription>
        </DialogHeader>

        {/* Large Seal Image */}
        <div className="flex justify-center py-6">
          <div className="relative w-48 h-48">
            <img
              src={achievement.imagePath}
              alt={achievement.title}
              className={`object-contain w-full h-full ${
                isUnlocked ? 'seal-unlocked seal-glow' : 'seal-locked'
              }`}
            />
          </div>
        </div>

        {/* Motto */}
        <div className="text-center px-4">
          <blockquote className="italic text-foreground border-l-2 border-primary/50 pl-4 text-sm">
            &ldquo;{achievement.motto}&rdquo;
          </blockquote>
        </div>

        {/* Unlock Date or Status */}
        <div className="mt-4 pt-4 border-t border-border/50">
          {isUnlocked && unlockDate ? (
            <div className="flex items-center justify-center gap-2 text-sm text-primary">
              <Calendar className="w-4 h-4" />
              <span>
                Kazanıldı: {unlockDate ? formatDate(unlockDate) : 'Yeni'}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Award className="w-4 h-4" />
              <span>Henüz kazanılmadı</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
