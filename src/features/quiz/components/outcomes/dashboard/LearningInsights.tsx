import { motion } from 'framer-motion';
import { ShieldCheck, Brain, Star, AlertTriangle } from 'lucide-react';

interface LearningInsightsProps {
  percentage: number;
  pendingReview: number;
  courseName?: string;
  strategy?: {
    importance: string;
    examTotal?: number;
  } | null;
}

export const LearningInsights = ({
  percentage,
  pendingReview,
  courseName,
  strategy,
}: LearningInsightsProps) => {
  return (
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
        {strategy && (
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
                ? `Mükemmel! ${courseName} gibi ${strategy.importance === 'high' ? 'hayati öneme sahip' : 'önemli'} bir derste ustalığını kanıtladın.`
                : percentage >= 70
                  ? `Gayet iyi. ${strategy.importance === 'high' ? 'Sınavda ağırlığı yüksek olan bu derste' : 'Bu konuda'} temelini sağlamlaştırdın.`
                  : percentage >= 50
                    ? `${courseName} için biraz daha pratik yapmalısın. SAK algoritması zayıf noktalarını belirledi.`
                    : `Eksiklerin var. ${strategy.importance === 'high' ? 'KRİTİK: Bu ders sınavda belirleyici rol oynuyor.' : ''} Hata telafisi ile üzerinden geçelim.`}
            </p>

            <div className="flex items-center gap-4 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <Star
                  className={`w-3.5 h-3.5 ${strategy.importance === 'high' ? 'text-amber-500 fill-amber-500' : 'text-zinc-500'}`}
                />
                <span className="text-[10px] font-bold text-zinc-400 uppercase">
                  Önem: {strategy.importance.toUpperCase()}
                </span>
              </div>
              {strategy.examTotal && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">
                    Soru Payı: %{Math.round((strategy.examTotal / 120) * 100)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {!strategy && (
          <div className="text-muted-foreground">
            {pendingReview > 0 ? (
              <p>
                <span className="text-amber-500 font-medium">
                  {pendingReview} soru
                </span>{' '}
                tekrar listesine eklendi. AI asistanın, yanlış yapılan sorular
                için özel takip soruları hazırlıyor...
              </p>
            ) : (
              <p>
                <span className="text-emerald-500 font-medium">Mükemmel!</span>{' '}
                Hiçbir soru tekrar listesine düşmedi. Konu hakimiyetin artıyor.
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
