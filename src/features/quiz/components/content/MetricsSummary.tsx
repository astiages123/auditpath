import { memo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, HelpCircle, Clock } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';

interface MetricsSummaryProps {
  masteryScore: number;
  pendingReview: number;
  totalTimeFormatted: string;
}

/**
 * Ustalık puanı, tekrar sayısı ve süre bilgilerini içeren grid paneli.
 */
export const MetricsSummary = memo(
  ({
    masteryScore,
    pendingReview,
    totalTimeFormatted,
  }: MetricsSummaryProps) => (
    <div className="grid grid-cols-2 gap-4">
      {[
        {
          label: 'Ustalık Puanı',
          value: `${masteryScore}/100`,
          icon: CheckCircle2,
          color: 'text-blue-500',
          bg: 'bg-blue-500/10',
          delay: 0.2,
        },
        {
          label: 'Tekrar',
          value: pendingReview,
          icon: HelpCircle,
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
          delay: 0.3,
        },
        {
          label: 'Toplam Süre',
          value: totalTimeFormatted,
          icon: Clock,
          color: 'text-purple-500',
          bg: 'bg-purple-500/10',
          delay: 0.4,
          full: true,
        },
      ].map((item) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: item.delay }}
          className={cn(
            'bg-card border border-border rounded-xl p-5 flex flex-col justify-between',
            item.full && 'col-span-2'
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <div className={cn('p-2 rounded-lg', item.bg)}>
              <item.icon className={cn('w-5 h-5', item.color)} />
            </div>
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div
            className={cn(
              'text-xl md:text-3xl font-bold',
              item.full && 'font-mono'
            )}
          >
            {item.value}
          </div>
        </motion.div>
      ))}
    </div>
  )
);

MetricsSummary.displayName = 'MetricsSummary';
