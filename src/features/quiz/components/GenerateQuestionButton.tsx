import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Sparkles } from 'lucide-react';
import { getChunkQuotaStatus } from '@/features/quiz/services/quizQuestionService';
import { type QuotaStatus } from '@/features/quiz/types';
import { generateForChunk } from '@/features/quiz/logic/quizParser';
import {
  type GenerationLog,
  type GenerationStep as LogStep,
} from '@/features/quiz/types';
import { toast } from 'sonner';
import { QuotaDisplay } from './QuizIntroViews';
import { GenerationLiveStream } from './QuizIntroViews';

interface GenerateQuestionButtonProps {
  chunkId: string;
  onComplete?: () => void;
  onOpenChange?: (open: boolean) => void;
  externalStats?: {
    existing: number;
    quota: number;
  };
  label?: string;
}

const stepProgress: Record<LogStep, number> = {
  INIT: 5,
  MAPPING: 20,
  GENERATING: 50,
  VALIDATING: 75,
  REVISION: 85,
  SAVING: 90,
  COMPLETED: 100,
  ERROR: 0,
};

export function GenerateQuestionButton({
  chunkId,
  onComplete,
  onOpenChange,
  externalStats,
  label,
}: GenerateQuestionButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [currentStep, setCurrentStep] = useState<LogStep | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  // Load status when modal opens
  const refreshStatus = useCallback(async () => {
    try {
      const newStatus = await getChunkQuotaStatus(chunkId);
      if (newStatus) {
        setStatus(newStatus);
      }
    } catch (e) {
      logger.error('Quota info fetch error', e as Error);
      toast.error('Kota bilgisi alınamadı.');
    }
  }, [chunkId]);

  // Load status on mount
  useEffect(() => {
    Promise.resolve().then(() => refreshStatus());
  }, [refreshStatus]);

  // Poll every 5 seconds if processing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status?.status === 'PROCESSING') {
      interval = setInterval(refreshStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [refreshStatus, status?.status]);

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setLogs([]);
        setCurrentStep(null);
        setSavedCount(0);
        setInitializing(true);
        refreshStatus().finally(() => setInitializing(false));
      });
    }
  }, [open, refreshStatus]);

  const handleGenerate = async () => {
    if (!status) return;

    setLoading(true);
    setLogs([]);
    setCurrentStep('INIT');
    setSavedCount(0);

    try {
      await generateForChunk(chunkId, {
        onTotalTargetCalculated: () => {},
        onLog: (log: GenerationLog) => {
          setLogs((prev) => [...prev, log]);
          setCurrentStep(log.step);

          // Real-time update for MAPPING phase
          if (log.step === 'MAPPING' && log.details?.conceptCount) {
            setStatus((prev) =>
              prev
                ? {
                    ...prev,
                    conceptCount:
                      Number(log.details.conceptCount) || prev.conceptCount,
                  }
                : prev
            );
          }
        },
        onQuestionSaved: (count: number) => {
          setSavedCount(count);
          // Update status optimistically
          setStatus((prev: QuotaStatus | null) =>
            prev ? { ...prev, used: prev.used + 1 } : prev
          );
        },
        onComplete: (result: { success: boolean; generated: number }) => {
          setLoading(false);
          refreshStatus();
          onComplete?.();

          if (result.success) {
            toast.success(`${result.generated} soru başarıyla üretildi!`);
          }
        },
        onError: (error: unknown) => {
          setLoading(false);
          toast.error(String(error));
        },
      });
    } catch (err: unknown) {
      logger.error('[QuizGen] Kritik hata:', err as Error);
      setLoading(false);
      toast.error(
        err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      );
    }
  };

  const displayedUsed = externalStats
    ? externalStats.existing + savedCount
    : (status?.used ?? 0);
  const displayedQuota = externalStats
    ? externalStats.quota
    : (status?.quota.total ?? 0);

  const isQuotaFull =
    externalStats && displayedUsed !== undefined
      ? displayedUsed >= displayedQuota
      : status?.isFull;

  const percentage =
    displayedQuota > 0
      ? Math.min(100, (displayedUsed / displayedQuota) * 100)
      : 0;

  const progress = currentStep ? stepProgress[currentStep] : 0;
  const isProcessing = loading;

  return (
    <Dialog
      modal={false}
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        onOpenChange?.(val);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          disabled={isProcessing}
          className="gap-2 text-sm border-dashed border-zinc-700 hover:border-zinc-500"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
              İşleniyor...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-yellow-500" />
              {label || 'Soru Üret'}
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Akıllı Soru Üretici
          </DialogTitle>
          <DialogDescription>
            Tarayıcı tabanlı soru üretimi - Her adımı canlı izle
          </DialogDescription>
        </DialogHeader>

        {initializing ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : status ? (
          <div className="py-4 space-y-4 flex-1 overflow-hidden flex flex-col">
            <QuotaDisplay
              displayedUsed={displayedUsed}
              displayedQuota={displayedQuota}
              loading={loading}
              savedCount={savedCount}
              progress={progress}
              percentage={percentage}
              currentStep={currentStep || undefined}
              conceptCount={status.conceptCount}
            />

            <GenerationLiveStream logs={logs} />

            {/* How it works - only when not loading */}
            {!loading && logs.length === 0 && (
              <div className="rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-600 border border-yellow-500/20">
                <p className="font-semibold mb-1">Nasıl Çalışır?</p>
                <ul className="list-disc list-inside space-y-1 opacity-90">
                  <li>Önce içerik haritası çıkarılır.</li>
                  <li>Sorular üretilir.</li>
                  <li>Her soru doğrulanır.</li>
                  <li>Onaylanan sorular kaydedilir.</li>
                </ul>
                <p className="mt-2 text-[10px] opacity-70">
                  Her adımı canlı izleyebilirsin.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Kota bilgisi alınamadı.
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleGenerate}
            disabled={loading || initializing || isQuotaFull}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Üretiliyor...
              </>
            ) : isQuotaFull ? (
              'Kota Doldu'
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Soru Üret
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
