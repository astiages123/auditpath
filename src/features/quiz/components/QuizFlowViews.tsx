import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ScrollText,
  Sparkles,
  Zap,
  Target,
  History,
  TrendingUp,
  BarChart3,
  Play,
  Loader2,
  CheckCircle,
  Coffee,
  Map,
  Brain,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TopicCompletionStats } from '@/features/courses/types/courseTypes';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { GenerationLog, GenerationStep } from '@/features/quiz/types';

// ============================================================================
// Briefing View (formerly BriefingView.tsx)
// ============================================================================

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

        <div className="flex flex-col gap-4 min-h-0">
          <motion.div
            variants={itemVariants}
            className="flex-1 p-5 bg-card/40 backdrop-blur-sm rounded-xl border border-border/50 flex flex-col justify-center gap-3 shadow-sm relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-12 h-12" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.15em]">
                Zorluk Analizi
              </span>
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
            </div>
          </motion.div>

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

// ============================================================================
// Smart Exam Loading View (formerly SmartExamView.tsx)
// ============================================================================

interface SmartExamViewProps {
  examProgress: { current: number; total: number };
  examLogs: GenerationLog[];
}

export function SmartExamView({ examProgress, examLogs }: SmartExamViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-0 w-full max-w-2xl mx-auto space-y-8 p-6 overflow-y-auto h-full">
      <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center text-center space-y-4 shrink-0">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white bg-zinc-900 rounded-full w-8 h-8 flex items-center justify-center border border-white/10">
                {Math.round(
                  (examProgress.current / (examProgress.total || 1)) * 100
                )}
                %
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">
              Sana Özel Karma Antrenman Hazırlanıyor
            </h3>
            <p className="text-sm text-muted-foreground">
              Öğrenme geçmişini analiz ediyor ve en verimli soruları
              seçiyorum...
            </p>
          </div>
        </div>

        <div className="w-full h-64 bg-muted/20 backdrop-blur-sm rounded-2xl border border-white/5 p-4 font-mono text-[10px] overflow-y-auto flex flex-col-reverse shadow-inner">
          {examLogs.map((log) => {
            const stepMap: Record<string, { label: string; color: string }> = {
              INIT: {
                label: 'Hazırlık',
                color: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
              },
              MAPPING: {
                label: 'Analiz',
                color: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
              },
              GENERATING: {
                label: 'Oluşturma',
                color:
                  'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
              },
            };
            const stepInfo = stepMap[log.step] || {
              label: log.step,
              color: 'bg-zinc-400/10 text-zinc-400 border-zinc-400/20',
            };

            return (
              <div
                key={log.id}
                className="flex items-center gap-3 mb-2 opacity-90 animate-in fade-in slide-in-from-left-1 duration-300"
              >
                <span className="text-zinc-500 text-[9px] min-w-[45px]">
                  {new Date(log.timestamp).toLocaleTimeString([], {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${stepInfo.color}`}
                >
                  {stepInfo.label}
                </span>
                <span className="text-zinc-300 truncate">{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Mapping Progress View (formerly MappingProgressView.tsx)
// ============================================================================

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
