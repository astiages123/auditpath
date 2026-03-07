import { memo } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Brain } from 'lucide-react';
import { type ExamSubjectWeight } from '@/features/quiz/types';

interface LearningInsightsProps {
  percentage: number;
  pendingReview: number;
  courseName?: string;
  strategy?: ExamSubjectWeight;
}

/**
 * Başarı durumu bazlı kişiselleştirilmiş geri bildirim mesajları.
 */
export const LearningInsights = memo(
  ({
    percentage,
    pendingReview,
    courseName,
    strategy,
  }: LearningInsightsProps) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-muted/30 border border-border/50 rounded-xl p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {strategy ? 'Zeki Başarı Özeti' : 'Özet Durum'}
      </h3>
      <div className="space-y-4 text-sm text-balance leading-relaxed">
        {strategy ? (
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              {percentage >= 70 ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <Brain className="w-5 h-5" />
              )}
              <span className="font-bold uppercase tracking-wider text-xs">
                {strategy.importance === 'high'
                  ? 'Kritik Ders Analizi'
                  : 'Konu Değerlendirmesi'}
              </span>
            </div>
            <p className="text-muted-foreground">
              {percentage >= 85
                ? `Mükemmel! ${courseName} gibi önemli bir derste ustalığını kanıtladın.`
                : percentage >= 70
                  ? `Gayet iyi. Bu konuda temelini sağlamlaştırdın.`
                  : percentage >= 50
                    ? `${courseName} için biraz daha pratik yapmalısın.`
                    : `Eksiklerin var. Hata telafisi ile üzerinden geçelim.`}
            </p>
          </div>
        ) : (
          <div className="text-muted-foreground">
            {pendingReview > 0 ? (
              <p>
                <span className="text-amber-500 font-medium">
                  {pendingReview} soru
                </span>{' '}
                tekrar listesine eklendi.
              </p>
            ) : (
              <p>
                <span className="text-emerald-500 font-medium">Mükemmel!</span>{' '}
                Hiçbir soru tekrar listesine düşmedi.
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
);

LearningInsights.displayName = 'LearningInsights';
