import { Calendar, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
      <DialogContent className="sm:max-w-sm bg-card border-border p-0 overflow-hidden">
        {/* Header — guild rengi ile arka plan */}
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

        {/* Resim — orta */}
        <div className="flex justify-center py-4">
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

        {/* Alt bilgi — motto + gereksinim + tarih */}
        <div className="px-6 pb-6 space-y-3">
          {/* Gereksinim */}
          <p className="text-center text-sm text-muted-foreground">
            {getRequirementDescription(achievement.requirement)}
          </p>

          {/* Motto */}
          <blockquote className="italic text-foreground/80 border-l-2 border-primary/40 pl-3 text-sm leading-relaxed">
            &ldquo;{achievement.motto}&rdquo;
          </blockquote>

          {/* Tarih / Durum */}
          <div className="pt-2 border-t border-border/40">
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
