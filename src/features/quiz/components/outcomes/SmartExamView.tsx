import React from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { GenerationLog } from '@/features/quiz/logic';

interface SmartExamViewProps {
  isGeneratingExam: boolean;
  examProgress: { current: number; total: number };
  examLogs: GenerationLog[];
  onStartSmartExam: () => void;
}

export function SmartExamView({
  examProgress,
  examLogs,
}: Omit<SmartExamViewProps, 'isGeneratingExam' | 'onStartSmartExam'>) {
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
                  {log.timestamp.toLocaleTimeString([], {
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
