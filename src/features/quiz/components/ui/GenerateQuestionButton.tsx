import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Progress } from '@/shared/components/ui/progress';
import {
  Loader2,
  Sparkles,
  Box,
  CheckCircle,
  AlertCircle,
  Brain,
  Zap,
  Shield,
  Database,
} from 'lucide-react';
import { getChunkQuotaStatus } from '../../api/repository';
import { type QuotaStatus } from '../../core/types';
import {
  QuizFactory,
  type GenerationLog,
  type GenerationStep as LogStep,
} from '@/features/quiz/core/factory';
import { toast } from 'sonner';

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

const stepIcons: Record<LogStep, React.ReactNode> = {
  INIT: <Box className="w-3.5 h-3.5" />,
  MAPPING: <Brain className="w-3.5 h-3.5" />,
  GENERATING: <Sparkles className="w-3.5 h-3.5" />,
  VALIDATING: <Shield className="w-3.5 h-3.5" />,
  SAVING: <Database className="w-3.5 h-3.5" />,
  COMPLETED: <CheckCircle className="w-3.5 h-3.5" />,
  ERROR: <AlertCircle className="w-3.5 h-3.5" />,
};

const stepColors: Record<LogStep, string> = {
  INIT: 'text-blue-500 bg-blue-500/10',
  MAPPING: 'text-purple-500 bg-purple-500/10',
  GENERATING: 'text-yellow-500 bg-yellow-500/10',
  VALIDATING: 'text-emerald-500 bg-emerald-500/10',
  SAVING: 'text-indigo-500 bg-indigo-500/10',
  COMPLETED: 'text-green-500 bg-green-500/10',
  ERROR: 'text-red-500 bg-red-500/10',
};

const stepProgress: Record<LogStep, number> = {
  INIT: 5,

  MAPPING: 20,
  GENERATING: 50,
  VALIDATING: 75,
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
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Load status when modal opens
  const refreshStatus = useCallback(async () => {
    try {
      const newStatus = await getChunkQuotaStatus(chunkId);
      if (newStatus) {
        setStatus(newStatus);
      }
    } catch (e) {
      console.error(e);
      toast.error('Kota bilgisi alınamadı.');
    }
  }, [chunkId]);

  // Load status on mount
  useEffect(() => {
    // Use microtask to avoid "setState in effect" warning
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
      // Use microtask to avoid "setState in effect" warning if synchronous
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
      const factory = new QuizFactory();
      await factory.generateForChunk(chunkId, {
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
        onQuestionSaved: (count) => {
          setSavedCount(count);
          // Update status optimistically
          setStatus((prev) => (prev ? { ...prev, used: prev.used + 1 } : prev));
        },
        onComplete: (result) => {
          setLoading(false);
          refreshStatus();
          onComplete?.();

          if (result.success) {
            toast.success(`${result.generated} soru başarıyla üretildi!`);
          }
        },
        onError: (error) => {
          setLoading(false);
          toast.error(error);
        },
      });
    } catch (err: unknown) {
      console.error('[QuizGen] Kritik hata:', err);
      setLoading(false);
      toast.error(
        err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      );
    }
  };

  const displayedUsed = externalStats
    ? externalStats.existing + savedCount
    : status?.used;
  const displayedQuota = externalStats
    ? externalStats.quota
    : status?.quota.total;

  const isQuotaFull =
    externalStats && displayedUsed !== undefined && displayedQuota !== undefined
      ? displayedUsed >= displayedQuota
      : status?.isFull;

  const percentage =
    displayedUsed !== undefined && displayedQuota !== undefined
      ? Math.min(100, (displayedUsed / displayedQuota) * 100)
      : 0;
  const progress = currentStep ? stepProgress[currentStep] : 0;
  // Ignore DB status 'PROCESSING' because client-side generation might have been interrupted, leaving it stuck.
  // We rely on local 'loading' state for the active session.
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
            {/* Quota Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Box className="w-4 h-4 text-blue-500" />
                  <span>Soru Kotası</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">
                    {displayedUsed} / {displayedQuota}
                  </span>
                  {loading && savedCount > 0 && (
                    <span className="text-xs text-green-500 font-medium bg-green-500/10 px-1.5 py-0.5 rounded animate-pulse">
                      +{savedCount}
                    </span>
                  )}
                </div>
              </div>

              <Progress
                value={loading ? progress : percentage}
                className="h-2"
                indicatorClassName={
                  loading
                    ? 'bg-yellow-500 transition-all duration-500'
                    : 'bg-blue-600'
                }
              />

              {loading && currentStep && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="w-3 h-3 text-yellow-500 animate-pulse" />
                  <span className="font-medium">{currentStep}</span>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-xl bg-muted/50 p-6 flex flex-col items-center justify-center gap-2 border border-border/50">
                <Brain className="w-6 h-6 text-purple-500 mb-1" />
                <span className="text-muted-foreground text-sm font-medium">
                  Tespit Edilen Kavram
                </span>
                <span className="font-mono text-foreground text-3xl font-bold tracking-tight">
                  {status.conceptCount}
                </span>
              </div>
            </div>

            {/* Real-time Log Panel */}
            {logs.length > 0 && (
              <div className="flex-1 overflow-hidden border border-border/50 rounded-lg bg-muted/20">
                <div className="p-2 border-b border-border/30 bg-muted/30 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Üretim Logları
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {logs.length} log
                  </span>
                </div>
                <div
                  ref={logContainerRef}
                  className="p-2 space-y-1.5 max-h-[450px] overflow-y-auto"
                >
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-start gap-2 p-2 rounded-md text-xs ${stepColors[log.step]}`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {stepIcons[log.step]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{log.step}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {log.timestamp.toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                        <span className="opacity-90 block mt-0.5">
                          {log.message}
                        </span>
                        {/* Show important details */}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <details className="mt-1">
                            <summary className="text-[10px] cursor-pointer opacity-70 hover:opacity-100">
                              Detaylar
                            </summary>
                            <pre className="text-[9px] mt-1 p-1.5 rounded bg-black/20 overflow-x-auto max-h-24">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
