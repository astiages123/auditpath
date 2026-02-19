import React, { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  Coffee,
  Map,
  Brain,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { GenerationLog, GenerationStep } from '@/features/quiz/types';
import { Button } from '@/components/ui/button';

interface MappingProgressViewProps {
  examProgress: { current: number; total: number };
  examLogs: GenerationLog[];
}

/**
 * Teacher's Voice: Replaces technical jargon with friendly academic preparation messages.
 */
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

  // New Progress Math Fix: Actual progress from engine
  const getProgressValue = () => {
    if (isAllDone) return 100;

    // If no questions saved yet, give step-based placeholder progress
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
    return Math.min(Math.max(percentage, 30), 98); // Start at 30% once questions start
  };

  const progressValue = getProgressValue();

  const steps = [
    {
      id: 'step-1',
      label: 'Hazırlık',
      icon: Coffee,
      matchSteps: ['INIT'] as GenerationStep[],
    },
    {
      id: 'step-2',
      label: 'Akıllı Haritalama',
      icon: Map,
      matchSteps: ['MAPPING'] as GenerationStep[],
    },
    {
      id: 'step-3',
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
      {/* Header & Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm font-semibold px-1 tracking-tight">
          <span className="text-primary/90">Akademik Hazırlık Süreci</span>
          <div className="flex flex-col items-end">
            <span
              className={`text-muted-foreground tabular-nums ${hasError ? 'text-red-500' : ''}`}
            >
              {hasError ? 'Hata Oluştu' : `%${progressValue}`}
            </span>
          </div>
        </div>
        <Progress
          value={progressValue}
          className={`h-2.5 bg-muted/50 transition-all duration-700 ease-in-out ${hasError ? '[&>div]:bg-red-500' : ''}`}
        />
        {examProgress.total > 0 && !isAllDone && !hasError && (
          <p className="text-[12px] text-center text-muted-foreground/80 font-medium animate-pulse">
            {examProgress.total} sorudan {examProgress.current} tanesi başarıyla
            kütüphaneye eklendi
          </p>
        )}
      </div>

      {/* Unified Checklist Flow */}
      <div className="space-y-8 relative">
        {/* Connection Line */}
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
            isAllDone && i === steps.length - 1
              ? 'Her şey hazır, harika bir öğrenme serüveni seni bekliyor! ✨'
              : stepActive || stepError
                ? getFriendlyMessage(latestStep, latestLog?.message)
                : null;

          return (
            <div
              key={step.id}
              className="group relative flex flex-col gap-1.5 px-1"
            >
              <div className="flex items-center gap-4">
                {/* Icon Container */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 ring-4 ring-background ${
                    stepDone
                      ? 'bg-emerald-500/15 text-emerald-500 scale-110'
                      : stepError
                        ? 'bg-red-500/15 text-red-500 scale-110'
                        : stepActive
                          ? 'bg-primary/20 text-primary shadow-lg shadow-primary/10 scale-110'
                          : 'bg-muted/50 text-muted-foreground/40 scale-100'
                  }`}
                >
                  {stepDone ? (
                    <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                  ) : stepError ? (
                    <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <step.icon
                      className={`w-4 h-4 ${stepActive ? 'animate-pulse' : ''}`}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[15px] font-bold tracking-tight transition-colors duration-300 ${
                    stepDone || stepActive || stepError
                      ? 'text-foreground'
                      : 'text-muted-foreground/40'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Sub-message for Active/Error/Completed Step */}
              {(stepActive ||
                stepError ||
                (isAllDone && i === steps.length - 1)) &&
                displayMessage && (
                  <div className="ml-12 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1 duration-500">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[13px] font-medium leading-tight ${stepError ? 'text-red-500/80' : 'text-muted-foreground/70'}`}
                      >
                        {displayMessage}
                      </span>
                      {stepActive && (
                        <div className="flex gap-1 items-center mb-0.5 opacity-60">
                          <span className="w-1 h-1 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1 h-1 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" />
                        </div>
                      )}
                    </div>
                    {stepActive && latestStep === 'GENERATING' && (
                      <span className="text-[11px] text-amber-600/80 font-medium italic">
                        Bu işlem içeriğin derinliğine göre 1-2 dakika sürebilir,
                        kütüphaneni zenginleştiriyoruz...
                      </span>
                    )}
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Detailed Live Logs */}
      <div className="pt-6 border-t border-border/10">
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center justify-between px-2 h-8 text-muted-foreground/60 hover:text-foreground transition-colors"
          onClick={() => setShowLogs(!showLogs)}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full bg-primary/40 ${!isAllDone && !hasError ? 'animate-pulse' : ''}`}
            />
            <span className="text-[11px] font-bold uppercase tracking-widest">
              Teknik İşlem Kayıtları
            </span>
          </div>
          {showLogs ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </Button>

        {showLogs && (
          <div className="mt-3 h-40 bg-muted/20 backdrop-blur-sm rounded-xl border border-border/10 p-4 font-mono text-[11px] overflow-y-auto flex flex-col-reverse gap-2 shadow-inner animate-in slide-in-from-top-2 duration-300">
            {examLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 opacity-90 animate-in fade-in slide-in-from-left-1 duration-300"
              >
                <span className="text-muted-foreground/50 text-[10px] tabular-nums pt-0.5 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="text-foreground/80 leading-relaxed break-all">
                  {log.message}
                </span>
              </div>
            ))}
            {examLogs.length === 0 && (
              <div className="text-muted-foreground/30 italic text-center py-4">
                Sistem yanıtı bekleniyor...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
