import { useState } from 'react';
import {
  CheckCircle,
  Coffee,
  Map,
  Brain,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { GenerationLog, GenerationStep } from '@/features/quiz/types';

interface MappingProgressViewProps {
  examProgress: { current: number; total: number };
  examLogs: GenerationLog[];
}

const getFriendlyMessage = (step: GenerationStep, msg: string) => {
  if (step === 'MAPPING')
    return 'Ders notlarındaki kritik kavramlar haritalandırılıyor...';
  if (step === 'GENERATING')
    return 'Senin için özgün ve öğretici soru senaryoları yazılıyor...';
  if (step === 'VALIDATING')
    return 'Sorunun akademik tutarlılığı ve bilimsel doğruluğu ölçülüyor...';
  if (step === 'REVISION')
    return 'Anlatımın daha net olması için soru üzerinde ince ayar yapılıyor...';
  if (step === 'SAVING')
    return 'Hazırlanan soru öğrenme kütüphanene ekleniyor!';
  return msg;
};

export function MappingProgressView({
  examProgress,
  examLogs,
}: MappingProgressViewProps) {
  const [showLogs, setShowLogs] = useState(false);
  const hasError = examLogs.some((l) => l.step === 'ERROR');
  const isAllDone = examLogs.some((l) => l.step === 'COMPLETED');
  const latestLog = examLogs[0];
  const latestStep = latestLog?.step;

  const getProgressValue = () => {
    if (isAllDone) return 100;
    if (examProgress.current === 0) {
      if (latestStep === 'INIT') return 10;
      if (latestStep === 'MAPPING') return 20;
      if (latestStep === 'GENERATING') return 30;
      return 5;
    }
    if (examProgress.total <= 0) return 30;
    const percentage = Math.round(
      (examProgress.current / examProgress.total) * 100
    );
    return Math.min(Math.max(percentage, 30), 98);
  };

  const progressValue = getProgressValue();
  const steps = [
    {
      id: 'prep',
      label: 'Hazırlık',
      icon: Coffee,
      matchSteps: ['INIT'] as GenerationStep[],
    },
    {
      id: 'map',
      label: 'Akıllı Haritalama',
      icon: Map,
      matchSteps: ['MAPPING'] as GenerationStep[],
    },
    {
      id: 'design',
      label: 'Soru Tasarımı',
      icon: Brain,
      matchSteps: [
        'GENERATING',
        'VALIDATING',
        'REVISION',
        'SAVING',
      ] as GenerationStep[],
    },
  ];

  return (
    <div className="w-full max-w-md space-y-10 py-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm font-semibold px-1">
          <span className="text-primary/90">Akademik Hazırlık Süreci</span>
          <span
            className={`text-muted-foreground tabular-nums ${hasError ? 'text-red-500' : ''}`}
          >
            {hasError ? 'Hata Oluştu' : `%${progressValue}`}
          </span>
        </div>
        <Progress
          value={progressValue}
          className={`h-2.5 transition-all duration-700 ${hasError ? '[&>div]:bg-red-500' : ''}`}
        />
      </div>

      <div className="space-y-8 relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-muted/30 -z-10" />
        {steps.map((step, i) => {
          const currentStepIndex = steps.findIndex((s) =>
            s.matchSteps.includes(latestStep)
          );
          const stepDone =
            i < currentStepIndex || (i === currentStepIndex && isAllDone);
          const stepActive = !hasError && i === currentStepIndex && !isAllDone;
          const stepError = hasError && i === currentStepIndex;

          const displayMessage =
            stepActive || stepError || (isAllDone && i === steps.length - 1)
              ? isAllDone && i === steps.length - 1
                ? 'Her şey hazır! ✨'
                : getFriendlyMessage(latestStep, latestLog?.message)
              : null;

          return (
            <div key={step.id} className="relative flex flex-col gap-1.5">
              <div className="flex items-center gap-4">
                <div
                  className={`relative z-10 w-8 h-8 rounded-xl flex items-center justify-center transition-all ring-4 ring-background ${
                    stepDone
                      ? 'bg-emerald-500/15 text-emerald-500 scale-110'
                      : stepError
                        ? 'bg-red-500/15 text-red-500 scale-110'
                        : stepActive
                          ? 'bg-primary/20 text-primary scale-110'
                          : 'bg-muted/50 text-muted-foreground/40'
                  }`}
                >
                  {stepDone ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : stepError ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <step.icon
                      className={`w-4 h-4 ${stepActive ? 'animate-pulse' : ''}`}
                    />
                  )}
                </div>
                <span
                  className={`text-[15px] font-bold ${stepDone || stepActive || stepError ? 'text-foreground' : 'text-muted-foreground/40'}`}
                >
                  {step.label}
                </span>
              </div>
              {displayMessage && (
                <div className="ml-12 text-[13px] text-muted-foreground/70 animate-in fade-in slide-in-from-top-1">
                  {displayMessage}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-border/10">
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center justify-between px-2 h-8"
          onClick={() => setShowLogs(!showLogs)}
        >
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Teknik Kayıtlar
          </span>
          {showLogs ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </Button>
        {showLogs && (
          <div className="mt-3 h-40 bg-muted/20 rounded-xl border p-4 font-mono text-[11px] overflow-y-auto flex flex-col-reverse gap-2">
            {examLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 opacity-90 animate-in fade-in"
              >
                <span className="text-muted-foreground/50 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="text-foreground/80 leading-relaxed truncate">
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
