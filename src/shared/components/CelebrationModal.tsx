import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/utils/stringHelpers';
import { LucideIcon } from 'lucide-react';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  subtitle?: string; // motto
  icon?: LucideIcon;
  imageUrl?: string;
  variant?: 'course' | 'rank' | 'achievement';
}

export function CelebrationModal({
  isOpen,
  onClose,
  title,
  description,
  subtitle,
  icon: Icon,
  imageUrl,
  variant = 'course',
}: CelebrationModalProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 100);

      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 100,
      };

      const randomInRange = (min: number, max: number) =>
        Math.random() * (max - min) + min;

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors:
            variant === 'rank' ? ['#fbbf24', '#f59e0b', '#d97706'] : undefined,
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors:
            variant === 'rank' ? ['#fbbf24', '#f59e0b', '#d97706'] : undefined,
        });
      }, 250);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [isOpen, variant]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-none bg-transparent shadow-none p-0 overflow-hidden outline-hidden [&>button]:hidden">
        {/* Accessibility requirement: Title and Description for screen readers */}
        <DialogTitle className="sr-only">
          {title}: {description}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {subtitle || description}
        </DialogDescription>

        <AnimatePresence>
          {showContent && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50, rotateX: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{
                type: 'spring',
                damping: 20,
                stiffness: 300,
                mass: 1,
              }}
              className={cn(
                'relative p-1 rounded-4xl overflow-hidden',
                variant === 'rank'
                  ? 'bg-linear-to-b from-amber-500/50 via-amber-600/30 to-amber-900/50'
                  : variant === 'achievement'
                    ? 'bg-linear-to-b from-purple-500/50 via-fuchsia-600/30 to-zinc-900/50'
                    : 'bg-linear-to-b from-blue-500/50 via-indigo-600/30 to-zinc-900/50'
              )}
            >
              <div
                className={cn(
                  'relative bg-zinc-950/90 backdrop-blur-3xl rounded-[1.9rem] p-8 text-center flex flex-col items-center gap-6 border border-white/5 shadow-2xl',
                  variant === 'rank' && 'border-amber-500/20'
                )}
              >
                {/* RPG Card Flare */}
                <div
                  className={cn(
                    'absolute inset-0 opacity-20 pointer-events-none',
                    variant === 'rank'
                      ? 'bg-radial-[at_center_top] from-amber-500/50 to-transparent'
                      : 'bg-radial-[at_center_top] from-blue-500/50 to-transparent'
                  )}
                />

                {/* Decoration Corner Elements (Pseudo-Medieval) */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-amber-500/30 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-amber-500/30 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-amber-500/30 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-500/30 rounded-br-lg" />

                <div className="flex flex-col items-center gap-6 relative z-10 w-full">
                  {/* Dynamic Visual: Image (Rank) or Icon */}
                  {imageUrl ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: 'spring',
                        damping: 15,
                        stiffness: 200,
                        delay: 0.3,
                      }}
                      className="relative group w-40 h-40"
                    >
                      <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full animate-pulse z-0" />
                      <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
                      />
                    </motion.div>
                  ) : (
                    Icon && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: 'spring',
                          damping: 15,
                          stiffness: 200,
                          delay: 0.3,
                        }}
                        className={cn(
                          'relative group',
                          variant === 'rank'
                            ? 'text-amber-400'
                            : 'text-blue-400'
                        )}
                      >
                        {/* Ornate Frame */}
                        <div
                          className={cn(
                            'absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse',
                            variant === 'rank' ? 'bg-amber-500' : 'bg-blue-500'
                          )}
                        />
                        <div
                          className={cn(
                            'relative p-8 rounded-full border-4 shadow-2xl transition-transform duration-500 group-hover:scale-110',
                            variant === 'rank'
                              ? 'bg-zinc-900 border-amber-500/50 shadow-amber-500/20'
                              : 'bg-zinc-900 border-blue-500/50 shadow-blue-500/20'
                          )}
                        >
                          <Icon className="w-16 h-16 stroke-[1.5px]" />
                        </div>
                      </motion.div>
                    )
                  )}

                  <div className="space-y-6 w-full text-center">
                    {/* 1. Small Title (Top) */}
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className={cn(
                        'text-2xl font-bold tracking-widest uppercase',
                        variant === 'rank'
                          ? 'text-amber-500/80'
                          : 'text-blue-300/80',
                        'mb-1'
                      )}
                    >
                      {title}
                    </motion.p>

                    {/* 2. Subtitle / Motto (Bottom) */}
                    {subtitle && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                      >
                        <div
                          className={cn(
                            'w-12 h-0.5 mx-auto mb-4 rounded-full opacity-50',
                            variant === 'rank' ? 'bg-amber-500' : 'bg-blue-500'
                          )}
                        />
                        <p
                          className={cn(
                            'text-base font-medium italic font-sans max-w-[280px] mx-auto leading-relaxed',
                            variant === 'rank'
                              ? 'text-amber-200/80'
                              : 'text-amber-500'
                          )}
                        >
                          &ldquo;{subtitle}&rdquo;
                        </p>
                      </motion.div>
                    )}

                    {/* 3. Big Description (Middle) - The Main Name */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5, type: 'spring' }}
                      className={cn(
                        'text-sm font-black tracking-tight leading-none',
                        variant === 'rank'
                          ? 'text-amber-100'
                          : 'text-foreground/90'
                      )}
                      style={{
                        textShadow:
                          variant === 'rank'
                            ? '0 0 30px rgba(251,191,36,0.4)'
                            : '0 0 30px rgba(59,130,246,0.4)',
                      }}
                    >
                      {description}
                    </motion.div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className={cn(
                      'mt-4 px-10 py-4 rounded-full font-black text-sm tracking-widest uppercase transition-all shadow-xl border',
                      variant === 'rank'
                        ? 'bg-amber-500 text-black border-amber-400 hover:bg-amber-400 hover:shadow-amber-500/40'
                        : variant === 'achievement'
                          ? 'bg-purple-600 text-white border-purple-500 hover:bg-purple-500 hover:shadow-purple-500/40'
                          : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500 hover:shadow-blue-500/40'
                    )}
                  >
                    Kaderine Devam Et
                  </motion.button>
                </div>

                {/* Decorative particles (Pseudo-CSS) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden rounded-[1.9rem]">
                  <div
                    className={cn(
                      'absolute top-0 left-0 w-full h-full opacity-10',
                      'bg-[radial-gradient(circle_at_center,var(--color-amber-500)_1px,transparent_1px)] bg-size-[40px_40px]'
                    )}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
