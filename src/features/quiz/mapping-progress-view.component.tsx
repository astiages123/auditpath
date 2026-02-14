import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle } from 'lucide-react';
import { GenerationLog } from '@/features/quiz/quiz-factory';

interface MappingProgressViewProps {
  examProgress: { current: number; total: number };
  examLogs: GenerationLog[];
}

export function MappingProgressView({
  examProgress,
  examLogs,
}: MappingProgressViewProps) {
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm font-medium px-1">
          <span className="text-primary">Bilişsel Haritalama</span>
          <span className="text-muted-foreground">
            {Math.round((examProgress.current / 10) * 100) || 0}%
          </span>
        </div>
        <Progress
          value={(examProgress.current / 10) * 100 || 5}
          className="h-2"
        />
      </div>

      <div className="space-y-4 text-left">
        {[
          { label: 'Metin içeriği okunuyor...', step: 'INIT' },
          { label: 'Bilişsel yük hesaplanıyor...', step: 'MAPPING' },
          { label: 'Kavram haritası çıkarılıyor...', step: 'GENERATING' },
        ].map((s, i) => {
          const logIndex = examLogs.findIndex((l) => l.step === s.step);
          const isDone =
            logIndex !== -1 || (s.step === 'INIT' && examLogs.length > 0);
          const isCurrent =
            (i === 0 && examLogs.length === 0) ||
            (i > 0 && examLogs.some((l) => l.step === s.step)) ||
            (i === 1 &&
              examLogs.some((l) => l.step === 'INIT') &&
              !examLogs.some((l) => l.step === 'MAPPING'));

          return (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isDone
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCurrent
                      ? 'border-primary animate-pulse text-primary'
                      : 'border-muted text-muted'
                }`}
              >
                {isDone ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              <span
                className={`text-[15px] font-medium ${isDone ? 'text-foreground' : isCurrent ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-muted/30 rounded-xl border border-border/50 font-mono text-[11px] h-32 overflow-hidden flex flex-col-reverse text-left">
        {examLogs.slice(0, 5).map((log) => (
          <div key={log.id} className="opacity-70 truncate">
            <span className="text-primary mr-2">[{log.step}]</span>
            <span>{log.message}</span>
          </div>
        ))}
        {examLogs.length === 0 && (
          <span className="animate-pulse">Analiz motoru başlatılıyor...</span>
        )}
      </div>
    </div>
  );
}
