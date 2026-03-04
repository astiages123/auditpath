import { useState, useEffect } from 'react';
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
import { QuotaDisplay } from '@/features/quiz/components/views/QuizIntroViews';
import { GenerationLiveStream } from '@/features/quiz/components/views/QuizIntroViews';
import { useQuestionGeneration } from '@/features/quiz/hooks/useQuestionGeneration';
import {
  GenerationLoadingDialog,
  GenerationSuccessDialog,
} from '@/features/quiz/components/modals/GenerationDialogs';

// === TYPES ===

interface GenerateQuestionButtonProps {
  /** Soru üretilecek içeriğin kimliği */
  chunkId: string;
  /** Üretim başarıyla tamamlandığında tetiklenir */
  onComplete?: () => void;
  /** Dialog açılıp kapandığında tetiklenir */
  onOpenChange?: (open: boolean) => void;
  /** Dışarıdan gelen kota istatistikleri */
  externalStats?: {
    existing: number;
    quota: number;
  };
  /** Buton üzerindeki metin */
  label?: string;
}

// === COMPONENT ===

/**
 * Akıllı soru üretme sürecini başlatan ve izleyen buton/dialog bileşeni.
 */
export function GenerateQuestionButton({
  chunkId,
  onComplete,
  onOpenChange,
  externalStats,
  label,
}: GenerateQuestionButtonProps) {
  // === STATE & HOOKS ===

  const [open, setOpen] = useState(false);
  const {
    genState,
    status,
    initializing,
    handleGenerate,
    currentStepInfo,
    resetStatus,
  } = useQuestionGeneration({
    chunkId,
    onComplete,
    open,
  });

  // === SIDE EFFECTS ===

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // === CALCULATIONS ===

  const displayedUsed = externalStats
    ? externalStats.existing + genState.savedCount
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

  const isProcessing = genState.loading;

  // === RENDER ===

  return (
    <>
      <Dialog modal={false} open={open} onOpenChange={setOpen}>
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
          {/* HEADER SECTION */}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Akıllı Soru Üretici
            </DialogTitle>
            <DialogDescription>
              Tarayıcı tabanlı soru üretimi - Her adımı canlı izle
            </DialogDescription>
          </DialogHeader>

          {/* MAIN CONTENT SECTION */}
          {initializing ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : status ? (
            <div className="py-4 space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Kota Bilgisi */}
              <QuotaDisplay
                displayedUsed={displayedUsed}
                displayedQuota={displayedQuota}
                loading={genState.loading}
                savedCount={genState.savedCount}
                progress={currentStepInfo?.progress || 0}
                percentage={percentage}
                currentStep={
                  genState.liveStreamLogs.length > 0
                    ? genState.liveStreamLogs[
                        genState.liveStreamLogs.length - 1
                      ].step
                    : undefined
                }
                conceptCount={status.conceptCount}
              />

              {/* Canlı Log Akışı */}
              <GenerationLiveStream logs={genState.liveStreamLogs} />

              {/* Yardımcı Bilgi Kutusu */}
              {!genState.loading && genState.liveStreamLogs.length === 0 && (
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

          {/* FOOTER SECTION */}
          <DialogFooter>
            <Button
              onClick={handleGenerate}
              disabled={genState.loading || initializing || isQuotaFull}
              className="w-full sm:w-auto"
            >
              {genState.loading ? (
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

      {/* DURUM DİALOGLARI */}
      <GenerationLoadingDialog
        open={genState.loading}
        status={genState.status}
        currentStep={genState.currentStep}
        logs={genState.logs}
      />

      <GenerationSuccessDialog
        open={genState.status === 'success'}
        onClose={resetStatus}
        savedCount={genState.savedCount}
      />
    </>
  );
}
