import React from 'react';
import {
  ScrollText,
  Sparkles,
  Zap,
  Target,
  History,
  TrendingUp,
  BarChart3,
  Play,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TopicCompletionStats } from '@/shared/types/efficiency';
import { Badge } from '@/shared/components/ui/badge';

interface BriefingViewProps {
  completionStatus: TopicCompletionStats;
  onStartQuiz: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0 },
};

export function BriefingView({
  completionStatus,
  onStartQuiz,
}: BriefingViewProps) {
  const isReady =
    completionStatus.antrenman.existing >= completionStatus.antrenman.quota;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full space-y-4 py-2"
    >
      {/* compact action button */}
      <motion.div variants={itemVariants}>
        <button
          onClick={onStartQuiz}
          className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98]"
        >
          <Play className="w-6 h-6 fill-current" />
          <span className="text-xl">
            {isReady ? 'ANTRENMANA BAŞLA' : 'SORULARI HAZIRLA'}
          </span>
        </button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Concepts Table */}
        <motion.div
          variants={itemVariants}
          className="bg-card/50 rounded-2xl border border-border overflow-hidden flex flex-col"
        >
          <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-muted-foreground" />
              <span className="text-base font-bold">Kavram Matrisi</span>
            </div>
            <Badge variant="outline" className="text-xs h-6 px-2">
              {completionStatus.concepts?.length || 0} Kavram
            </Badge>
          </div>

          <div className="overflow-y-auto max-h-[320px] custom-scrollbar">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border/50">
                {completionStatus.concepts?.map((c, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-foreground/90">
                        {c.baslik}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`text-[11px] font-black uppercase tracking-wider ${
                          c.seviye === 'Analiz'
                            ? 'text-red-500'
                            : c.seviye === 'Uygulama'
                              ? 'text-amber-500'
                              : 'text-blue-500'
                        }`}
                      >
                        {c.seviye}
                      </span>
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td className="px-5 py-12 text-center text-muted-foreground text-sm italic">
                      Veriler analiz ediliyor...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Right: Analysis & Stats */}
        <div className="flex flex-col gap-4 h-full">
          {/* Difficulty index */}
          <motion.div
            variants={itemVariants}
            className="flex-1 p-6 bg-muted/20 rounded-2xl border border-border flex flex-col justify-center gap-2"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs font-black uppercase text-muted-foreground tracking-[0.15em]">
                  Zorluk Analizi
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Sparkles
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= (completionStatus.difficultyIndex || 3)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-muted-foreground/20'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black leading-none">
                {completionStatus.difficultyIndex || '3.5'}
              </span>
              <span className="text-sm font-bold text-muted-foreground">
                / 5
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-primary"
                style={{
                  width: `${(completionStatus.difficultyIndex || 3.5) * 20}%`,
                }}
              />
            </div>
          </motion.div>

          {/* Question Distribution */}
          <motion.div
            variants={itemVariants}
            className="flex-1 p-6 bg-card rounded-2xl border border-border flex flex-col justify-center"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs font-black uppercase text-muted-foreground tracking-[0.15em]">
                Soru Dağılımı
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: 'Antrenman',
                  value: completionStatus.antrenman.quota,
                  icon: Zap,
                  color: 'text-blue-500',
                },
                {
                  label: 'Deneme',
                  value: completionStatus.deneme.quota,
                  icon: Target,
                  color: 'text-purple-500',
                },
                {
                  label: 'Arşiv',
                  value: completionStatus.arsiv.quota,
                  icon: History,
                  color: 'text-emerald-500',
                },
              ].map((d, i) => (
                <div key={i} className="text-center group">
                  <div className="flex justify-center mb-2">
                    <d.icon
                      size={20}
                      className={`${d.color} transition-transform group-hover:scale-110`}
                    />
                  </div>
                  <div className="text-2xl font-black leading-none mb-1">
                    {d.value}
                  </div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-tight">
                    {d.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
