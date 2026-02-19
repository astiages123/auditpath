import { motion } from 'framer-motion';
import { CheckCircle2, HelpCircle, Clock } from 'lucide-react';

interface MetricsSummaryProps {
  masteryScore: number;
  pendingReview: number;
  totalTimeFormatted: string;
}

export const MetricsSummary = ({
  masteryScore,
  pendingReview,
  totalTimeFormatted,
}: MetricsSummaryProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Mastery */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between"
      >
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-sm font-medium">Ustalık Puanı</span>
        </div>
        <div className="text-3xl font-bold">{masteryScore}/100</div>
      </motion.div>

      {/* Pending Review */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between"
      >
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <HelpCircle className="w-5 h-5 text-amber-500" />
          </div>
          <span className="text-sm font-medium">Tekrar</span>
        </div>
        <div className="text-3xl font-bold">{pendingReview}</div>
      </motion.div>

      {/* Total Time */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between col-span-2"
      >
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <span className="text-sm font-medium">Toplam Süre</span>
        </div>
        <div className="text-3xl font-bold font-mono">{totalTimeFormatted}</div>
      </motion.div>
    </div>
  );
};
