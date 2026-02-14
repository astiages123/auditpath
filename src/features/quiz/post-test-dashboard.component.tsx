import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { type TestResultSummary } from './quiz.types';
import { getSubjectStrategy } from '@/features/quiz/quiz-logic';
import {
  Brain,
  Star,
  AlertTriangle,
  ShieldCheck,
  Home,
  Clock,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface PostTestDashboardProps {
  results: TestResultSummary;
  onClose: () => void;
  courseName?: string;
}

export function PostTestDashboard({
  results,
  onClose,
  courseName,
}: PostTestDashboardProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const strategy = courseName ? getSubjectStrategy(courseName) : null;

  useEffect(() => {
    // Animate percentage
    const timer = setTimeout(() => {
      setAnimatedPercent(results.percentage);
    }, 500);
    return () => clearTimeout(timer);
  }, [results.percentage]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-2"
      >
        <h2 className="text-3xl font-bold bg-linear-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
          Test Tamamlandı!
        </h2>
        <p className="text-muted-foreground">Oturum başarıyla kaydedildi.</p>
      </motion.div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent pointer-events-none" />

          <div className="relative w-48 h-48 mb-4">
            <svg className="w-full h-full transform -rotate-90">
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
                className={`fill-none transition-all duration-1000 ease-out ${
                  results.percentage >= 70
                    ? 'stroke-emerald-500'
                    : 'stroke-amber-500'
                }`}
                strokeWidth="12"
                strokeDasharray={553}
                strokeDashoffset={553 - (553 * animatedPercent) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold tracking-tighter">
                %{animatedPercent}
              </span>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-2">
                Başarı
              </span>
            </div>
          </div>
        </motion.div>

        {/* Metrics Grid */}
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
            <div className="text-3xl font-bold">{results.masteryScore}/100</div>
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
            <div className="text-3xl font-bold">{results.pendingReview}</div>
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
            <div className="text-3xl font-bold font-mono">
              {results.totalTimeFormatted}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Status Summary / Insights */}
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
                {results.percentage >= 70 ? (
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
                {results.percentage >= 85
                  ? `Mükemmel! ${courseName} gibi ${strategy.importance === 'high' ? 'hayati öneme sahip' : 'önemli'} bir derste ustalığını kanıtladın.`
                  : results.percentage >= 70
                    ? `Gayet iyi. ${strategy.importance === 'high' ? 'Sınavda ağırlığı yüksek olan bu derste' : 'Bu konuda'} temelini sağlamlaştırdın.`
                    : results.percentage >= 50
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
              {results.pendingReview > 0 ? (
                <p>
                  <span className="text-amber-500 font-medium">
                    {results.pendingReview} soru
                  </span>{' '}
                  tekrar listesine eklendi. AI asistanın, yanlış yapılan sorular
                  için özel takip soruları hazırlıyor...
                </p>
              ) : (
                <p>
                  <span className="text-emerald-500 font-medium">
                    Mükemmel!
                  </span>{' '}
                  Hiçbir soru tekrar listesine düşmedi. Konu hakimiyetin
                  artıyor.
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex gap-4 pt-4"
      >
        <button
          onClick={onClose}
          className="flex-1 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" />
          Ana Menüye Dön
        </button>
      </motion.div>
    </div>
  );
}
