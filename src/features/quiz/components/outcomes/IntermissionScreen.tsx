import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Brain } from 'lucide-react';
import { ReviewItem } from '@/features/quiz/types';

interface IntermissionScreenProps {
  batchIndex: number;
  totalBatches: number;
  completedBatchQuestions: ReviewItem[]; // We might need results passed here too?
  // Actually, calculating results for just the batch is tricky unless we filter `results`
  // Simpler: Just show "Batch X Completed" and motivation.
  onContinue: () => void;
  correctCount?: number;
  incorrectCount?: number;
}

export function IntermissionScreen({
  batchIndex,
  totalBatches,
  onContinue,
  correctCount = 0,
  incorrectCount = 0,
}: IntermissionScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto text-center py-12 space-y-8"
    >
      <div className="space-y-2">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-500/30 mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-bold bg-linear-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
          {batchIndex + 1}. Set Tamamlandı!
        </h2>
        <p className="text-muted-foreground text-lg">
          Harika gidiyorsun. Sırada {totalBatches - (batchIndex + 1)} set daha
          var.
        </p>
      </div>

      {/* Mini Stats for this Batch */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-background/50 border border-emerald-500/20 rounded-xl">
          <div className="text-3xl font-bold text-emerald-500 mb-1">
            {correctCount}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Doğru
          </div>
        </div>
        <div className="p-4 bg-background/50 border border-red-500/20 rounded-xl">
          <div className="text-3xl font-bold text-red-500 mb-1">
            {incorrectCount}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Yanlış
          </div>
        </div>
      </div>

      <div className="bg-muted/10 p-4 rounded-xl text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2 text-foreground font-medium">
          <Brain className="w-4 h-4 text-primary" />
          <span>Bilişsel Mola</span>
        </div>
        <p>Kısa bir nefes al ve hazır olduğunda devam et.</p>
      </div>

      <button
        onClick={onContinue}
        className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2 group"
      >
        <span>Sıradaki Sete Geç</span>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
}
