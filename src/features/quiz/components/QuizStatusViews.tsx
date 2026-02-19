import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight, RotateCcw } from 'lucide-react';

// --- Loading View ---
interface QuizLoadingViewProps {
  isLoading: boolean;
  generatedCount: number;
  totalToGenerate: number;
}

export const QuizLoadingView: React.FC<QuizLoadingViewProps> = ({
  isLoading,
  generatedCount,
  totalToGenerate,
}) => {
  return (
    <div className="text-center py-12 space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
      <div className="space-y-1">
        <h3 className="text-lg font-medium text-white">
          {isLoading ? 'Sorular Hazırlanıyor...' : 'Oturum Hazırlanıyor...'}
        </h3>
        {isLoading && totalToGenerate > 0 && (
          <p className="text-muted-foreground">
            {generatedCount} / {totalToGenerate} tamamlanıyor
          </p>
        )}
      </div>
    </div>
  );
};

// --- Ready View ---
interface QuizReadyViewProps {
  onStart: () => void;
  currentBatchIndex: number;
  totalBatches: number;
  generatedCount: number;
}

export const QuizReadyView: React.FC<QuizReadyViewProps> = ({
  onStart,
  currentBatchIndex,
  totalBatches,
  generatedCount,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12 space-y-6"
    >
      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto ring-1 ring-primary/50">
        <ArrowRight className="w-8 h-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-white">Hazır mısın?</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          {totalBatches > 1
            ? `${currentBatchIndex + 1}. Set başlıyor. (${generatedCount} Soru)`
            : `${generatedCount} adet antrenman sorusu hazırlandı.`}
        </p>
      </div>
      <button
        onClick={onStart}
        className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25"
      >
        Antrenmanı Başlat
      </button>
    </motion.div>
  );
};

// --- Error View ---
interface QuizErrorViewProps {
  error: string;
  onRetry: () => void;
}

export const QuizErrorView: React.FC<QuizErrorViewProps> = ({
  error,
  onRetry,
}) => {
  return (
    <div className="text-center py-12 space-y-4">
      <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
        <RotateCcw className="w-6 h-6 text-red-500" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-medium text-red-500">Oturum Hatası</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">{error}</p>
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
};
