import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, PartyPopper } from 'lucide-react';
import { type SubmissionResult } from '@/features/quiz/types';

interface MasteryUpdateOverlayProps {
  lastSubmissionResult: SubmissionResult | null;
  previousMastery: number | null;
}

export const MasteryUpdateOverlay: React.FC<MasteryUpdateOverlayProps> = ({
  lastSubmissionResult,
  previousMastery,
}) => {
  return (
    <AnimatePresence>
      {lastSubmissionResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-2xl p-5 shadow-xl relative overflow-hidden group mb-4"
        >
          {/* Background Accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-primary/10" />

          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
            <div className="p-3 bg-primary/10 rounded-xl ring-1 ring-primary/30">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-3 gap-y-1">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  İlerleme Güncellendi
                </h4>
                {lastSubmissionResult.scoreDelta > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-full border border-emerald-500/20">
                    +{lastSubmissionResult.scoreDelta} Puan
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-baseline gap-2 justify-center sm:justify-start">
                <p className="text-xl font-bold text-white">Uzmanlık Artışı:</p>
                <span className="text-2xl font-black text-primary">
                  +%
                  {lastSubmissionResult.newMastery -
                    (previousMastery ?? lastSubmissionResult.newMastery)}
                </span>
              </div>

              {lastSubmissionResult.isTopicRefreshed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-2 flex items-center gap-2 text-emerald-400 font-medium"
                >
                  <PartyPopper className="w-4 h-4" />
                  <span className="text-sm">
                    Tebrikler! Bu konuyu pekiştirdin.
                  </span>
                </motion.div>
              )}
            </div>

            <div className="flex flex-col items-center sm:items-end">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-tighter mb-1">
                Yeni Seviye
              </span>
              <div className="text-3xl font-black text-white bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                %{lastSubmissionResult.newMastery}
              </div>
            </div>
          </div>

          {/* Micro Progress Bar */}
          <div className="absolute bottom-0 left-0 h-1 bg-primary/30 w-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${lastSubmissionResult.newMastery}%`,
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-primary"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
