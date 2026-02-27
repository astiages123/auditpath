import {
  Sparkles,
  Trophy,
  Lock,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { RANKS } from '@/features/achievements/utils/constants';
import { cn } from '@/utils/stringHelpers';

export { RANKS };

interface TitleRoadmapProps {
  watchedVideos: number;
  requiredVideos: number;
}

// === CIRCULAR PROGRESS RING ===
function CircularProgress({ progress }: { progress: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        {/* Track */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className="text-white/5"
        />
        {/* Progress */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
        <defs>
          <linearGradient
            id="progressGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black font-mono text-foreground leading-none">
          {progress}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Puan
        </span>
      </div>
    </div>
  );
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
    color: rank.color,
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

  const nextThreshold = nextMilestone ? nextMilestone.threshold : 100;
  const toNext = Math.max(0, nextThreshold - progress);

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════
          HERO BÖLÜMÜ
      ══════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card">
        {/* Arka plan dekor */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute inset-0 bg-grid-white/[0.02]" />
        </div>

        <div className="relative flex flex-col md:flex-row items-center gap-6 p-6 md:p-8">
          {/* Rank Görseli */}
          <div className="relative flex-shrink-0">
            {/* Glow halkası */}
            <div className="absolute inset-0 rounded-full bg-accent/20 blur-2xl scale-110" />
            <img
              src={currentMilestone.imagePath}
              alt={currentMilestone.title}
              className="relative w-36 h-36 md:w-44 md:h-44 object-contain"
            />
          </div>

          {/* Orta Bilgi */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent mb-2 flex items-center justify-center md:justify-start gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Mevcut Unvanın
            </p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3 bg-gradient-to-r from-foreground via-foreground/90 to-accent bg-clip-text text-transparent">
              {currentMilestone.title}
            </h2>
            <p className="text-sm text-muted-foreground italic leading-relaxed max-w-md mx-auto md:mx-0">
              "{currentMilestone.motto}"
            </p>

            {/* İzlenen video sayacı */}
            <div className="flex items-center justify-center md:justify-start gap-2 mt-4">
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-3 py-1 border border-border/60">
                <span className="font-bold text-foreground">
                  {watchedVideos}
                </span>{' '}
                / {requiredVideos} ders
              </span>
            </div>
          </div>

          {/* Circular Progress */}
          <div className="flex-shrink-0">
            <CircularProgress progress={progress} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          PATH / ZAMANÇİZELGESİ BÖLÜMÜ
      ══════════════════════════════════════ */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground mb-6 flex items-center gap-2">
          <span className="w-4 h-px bg-border inline-block" />
          Yolculuk Haritası
          <span className="flex-1 h-px bg-border inline-block" />
        </p>

        {/* MASAÜSTÜ: Yatay Path */}
        <div className="hidden md:block">
          <div className="relative">
            {/* Bağlantı çizgisi */}
            <div className="absolute top-[52px] left-[10%] right-[10%] h-0.5 bg-border/40" />
            {/* Tamamlanan kısım */}
            <div
              className="absolute top-[52px] left-[10%] h-0.5 bg-gradient-to-r from-primary to-accent origin-left"
              style={{
                width: `${(currentRankIndex / (milestones.length - 1)) * 80}%`,
              }}
            />

            <div className="grid grid-cols-4 gap-4">
              {milestones.map((milestone, index) => {
                const isCompleted =
                  progress >= milestone.threshold && index < currentRankIndex;
                const isCurrent = index === currentRankIndex;
                const isLocked = index > currentRankIndex;

                return (
                  <div
                    key={milestone.id}
                    className="flex flex-col items-center gap-3"
                  >
                    {/* Durak ikonu */}
                    <div className="relative z-10">
                      {isCurrent ? (
                        <div className="w-[104px] h-[104px] rounded-2xl bg-accent/10 border-2 border-accent shadow-[0_0_20px_rgba(var(--accent),0.25)] flex items-center justify-center">
                          <img
                            src={milestone.imagePath}
                            alt={milestone.title}
                            className="w-20 h-20 object-contain"
                          />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'w-[104px] h-[104px] rounded-2xl border-2 flex items-center justify-center transition-all duration-300',
                            isCompleted
                              ? 'border-primary/60 bg-primary/5'
                              : 'border-border/40 bg-muted/30'
                          )}
                        >
                          <img
                            src={milestone.imagePath}
                            alt={milestone.title}
                            className={cn(
                              'w-20 h-20 object-contain transition-all duration-300',
                              isLocked && 'grayscale opacity-40'
                            )}
                          />
                        </div>
                      )}
                      {/* Durum rozeti */}
                      <div
                        className={cn(
                          'absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center border-2 border-card',
                          isCompleted
                            ? 'bg-primary'
                            : isCurrent
                              ? 'bg-accent'
                              : 'bg-muted'
                        )}
                      >
                        {isCompleted && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                        )}
                        {isCurrent && (
                          <div className="w-2 h-2 rounded-full bg-accent-foreground" />
                        )}
                        {isLocked && (
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Bilgi */}
                    <div className="text-center">
                      <p
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
                      </p>
                      <p className="text-[11px] text-muted-foreground/50 font-mono mt-0.5">
                        %{milestone.threshold}+
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MOBİL: Dikey Zaman Çizelgesi */}
        <div className="md:hidden space-y-1">
          {milestones.map((milestone, index) => {
            const isCompleted =
              progress >= milestone.threshold && index < currentRankIndex;
            const isCurrent = index === currentRankIndex;
            const isLocked = index > currentRankIndex;
            const isLast = index === milestones.length - 1;

            return (
              <div key={milestone.id} className="flex gap-4">
                {/* Sol: çizgi + ikon */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0',
                      isCurrent
                        ? 'border-accent bg-accent/10 shadow-[0_0_12px_rgba(var(--accent),0.3)]'
                        : isCompleted
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border/30 bg-muted/20'
                    )}
                  >
                    <img
                      src={milestone.imagePath}
                      alt={milestone.title}
                      className={cn(
                        'w-7 h-7 object-contain',
                        isLocked && 'grayscale opacity-40'
                      )}
                    />
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        'w-0.5 flex-1 my-1 min-h-[20px]',
                        isCompleted ? 'bg-primary/40' : 'bg-border/30'
                      )}
                    />
                  )}
                </div>

                {/* Sağ: İçerik */}
                <div className="pb-4 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={cn(
                        'font-bold text-sm',
                        isCurrent
                          ? 'text-accent'
                          : isCompleted
                            ? 'text-foreground'
                            : 'text-muted-foreground/50'
                      )}
                    >
                      {milestone.title}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold bg-accent/15 text-accent px-2 py-0.5 rounded-full">
                        Aktif
                      </span>
                    )}
                    {isCompleted && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    )}
                    {isLocked && (
                      <Lock className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    )}
                  </div>
                  <p
                    className={cn(
                      'text-xs leading-snug',
                      isCurrent
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/40'
                    )}
                  >
                    {milestone.motto}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/30 mt-1">
                    %{milestone.threshold}+ gerekli
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════
          FOOTER BANNER
      ══════════════════════════════════════ */}
      <div>
        {nextMilestone ? (
          <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/5 via-accent/8 to-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="pointer-events-none absolute inset-0 bg-grid-white/[0.02]" />
            <div className="relative flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-4.5 h-4.5 text-accent" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                  Sıradaki Durak
                </p>
                <p className="font-bold text-foreground">
                  {nextMilestone.title}
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    — "{nextMilestone.motto}"
                  </span>
                </p>
              </div>
            </div>
            <div className="relative flex items-center gap-2 ml-auto flex-shrink-0">
              <div className="text-right">
                <p className="text-2xl font-black font-mono text-accent leading-none">
                  %{toNext}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Kaldı
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-accent/50" />
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/10 via-primary/8 to-accent/10 p-6 text-center">
            <div className="inline-flex items-center gap-2 text-accent font-bold">
              <Sparkles className="w-5 h-5" />
              Maksimum Seviyeye Ulaştın! Efsane olmak bu.
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
