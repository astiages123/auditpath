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
import { TopicCompletionStats } from '@/features/courses/types/courseTypes';
import { Badge } from '@/components/ui/badge';

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
      className="w-full h-full flex flex-col gap-4 py-2 min-h-0"
    >
      {/* compact action button */}
      <motion.div variants={itemVariants} className="shrink-0">
        <button
          onClick={onStartQuiz}
          className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98] border border-emerald-500/20"
        >
          <Play className="w-5 h-5 fill-current" />
          <span className="text-lg">
            {isReady ? 'ANTRENMANA BAŞLA' : 'SORULARI HAZIRLA'}
          </span>
        </button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-[1.0fr_1.0fr] gap-4 flex-1 min-h-0">
        {/* Left: Concepts Table */}
        <motion.div
          variants={itemVariants}
          className="bg-card/40 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden flex flex-col min-h-0 shadow-sm"
        >
          <div className="px-4 py-3 border-b border-border/30 bg-muted/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ScrollText className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-bold">Kavram Matrisi</span>
            </div>
            <Badge
              variant="secondary"
              className="text-[10px] h-5 px-2 font-bold"
            >
              {completionStatus.concepts?.length || 0} KAVRAM
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border/50">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-md z-10">
                <tr className="border-b border-border/50">
                  <th className="px-4 py-3 text-left text-[11px] font-black text-foreground uppercase tracking-wider border-r border-border/30">
                    Kavram Adı
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-black text-foreground uppercase tracking-wider">
                    Seviye
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {completionStatus.concepts?.map((c, i) => (
                  <tr
                    key={i}
                    className="hover:bg-primary/5 transition-colors group"
                  >
                    <td className="px-4 py-3 border-r border-border/10">
                      <div className="font-bold text-foreground/90 group-hover:text-primary transition-colors">
                        {c.baslik}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center min-w-[80px] text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-xs ${
                          c.seviye === 'Analiz'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : c.seviye === 'Uygulama'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        }`}
                      >
                        {c.seviye}
                      </span>
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-5 py-12 text-center text-muted-foreground text-sm italic"
                    >
                      Veriler analiz ediliyor...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Right: Analysis & Stats */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* Difficulty index */}
          <motion.div
            variants={itemVariants}
            className="flex-1 p-5 bg-card/40 backdrop-blur-sm rounded-xl border border-border/50 flex flex-col justify-center gap-3 shadow-sm relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-12 h-12" />
            </div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.15em]">
                  Zorluk Analizi
                </span>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Sparkles
                    key={star}
                    className={`w-3 h-3 ${
                      star <= (completionStatus.difficultyIndex || 3)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-muted-foreground/10'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-baseline gap-2 relative z-10">
              <span className="text-5xl font-black leading-none tracking-tighter bg-linear-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {completionStatus.difficultyIndex || '3.5'}
              </span>
              <span className="text-sm font-bold text-muted-foreground">
                / 5
              </span>
            </div>

            <div className="space-y-1.5 relative z-10">
              <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(completionStatus.difficultyIndex || 3.5) * 20}%`,
                  }}
                  className="h-full bg-primary"
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <p className="text-[10px] font-medium text-muted-foreground italic">
                Bu konu ortalama zorluk seviyesindedir.
              </p>
            </div>
          </motion.div>

          {/* Question Distribution */}
          <motion.div
            variants={itemVariants}
            className="flex-1 p-5 bg-card/40 backdrop-blur-sm rounded-xl border border-border/50 flex flex-col justify-center shadow-sm relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <BarChart3 className="w-12 h-12" />
            </div>

            <div className="flex items-center gap-2 mb-6 relative z-10">
              <span className="text-xs font-black uppercase text-muted-foreground tracking-[0.15em]">
                Soru Dağılımı
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 relative z-10">
              {[
                {
                  label: 'Antrenman',
                  value: completionStatus.antrenman.quota,
                  icon: Zap,
                  color: 'text-blue-500',
                  bg: 'bg-blue-500/10',
                },
                {
                  label: 'Deneme',
                  value: completionStatus.deneme.quota,
                  icon: Target,
                  color: 'text-purple-500',
                  bg: 'bg-purple-500/10',
                },
                {
                  label: 'Arşiv',
                  value: completionStatus.arsiv.quota,
                  icon: History,
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-500/10',
                },
              ].map((d, i) => (
                <div
                  key={i}
                  className="text-center p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={`flex justify-center mb-2 w-10 h-10 mx-auto items-center rounded-lg ${d.bg}`}
                  >
                    <d.icon size={22} className={`${d.color}`} />
                  </div>
                  <div className="text-3xl font-black leading-none mb-1">
                    {d.value}
                  </div>
                  <div className="text-[11px] font-black text-muted-foreground uppercase tracking-tight">
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
