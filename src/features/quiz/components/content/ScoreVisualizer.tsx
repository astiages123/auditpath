import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/stringHelpers';

interface ScoreVisualizerProps {
  percentage: number;
  animatedPercent: number;
}

/**
 * Başarı yüzdesini dairesel bir grafik ile görselleştirir.
 */
export const ScoreVisualizer = memo(
  ({ percentage, animatedPercent }: ScoreVisualizerProps) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card border border-border rounded-2xl p-6 flex-col flex-center relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="relative w-36 h-36 md:w-48 md:h-48 mb-4">
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 192 192"
        >
          <circle
            cx="96"
            cy="96"
            r="88"
            className="stroke-muted fill-none"
            strokeWidth="12"
          />
          <circle
            cx="96"
            cy="96"
            r="88"
            strokeWidth="12"
            strokeDasharray={553}
            strokeDashoffset={553 - (553 * animatedPercent) / 100}
            strokeLinecap="round"
            className={cn(
              'fill-none transition-all duration-1000 ease-out',
              percentage >= 70 ? 'stroke-emerald-500' : 'stroke-amber-500'
            )}
          />
        </svg>
        <div className="absolute inset-0 flex-col flex-center">
          <span className="text-3xl md:text-5xl font-bold tracking-tighter">
            {animatedPercent}
          </span>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-2">
            Başarı Puanı
          </span>
        </div>
      </div>
    </motion.div>
  )
);

ScoreVisualizer.displayName = 'ScoreVisualizer';
