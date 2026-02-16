import React, { useRef, useEffect } from 'react';
import {
  type GenerationLog,
  type GenerationStep as LogStep,
} from '@/features/quiz/logic';
import {
  Coffee,
  Map,
  PenTool,
  SearchCheck,
  Wand2,
  Library,
  CircleCheck,
  AlertCircle,
} from 'lucide-react';

const stepIcons: Record<LogStep, React.ReactNode> = {
  INIT: <Coffee className="w-3.5 h-3.5" />,
  MAPPING: <Map className="w-3.5 h-3.5" />,
  GENERATING: <PenTool className="w-3.5 h-3.5" />,
  VALIDATING: <SearchCheck className="w-3.5 h-3.5" />,
  REVISION: <Wand2 className="w-3.5 h-3.5" />,
  SAVING: <Library className="w-3.5 h-3.5" />,
  COMPLETED: <CircleCheck className="w-3.5 h-3.5" />,
  ERROR: <AlertCircle className="w-3.5 h-3.5" />,
};

const stepColors: Record<LogStep, string> = {
  INIT: 'text-amber-600/90 bg-amber-50/50',
  MAPPING: 'text-violet-600/90 bg-violet-50/50',
  GENERATING: 'text-rose-600/90 bg-rose-50/50',
  VALIDATING: 'text-teal-600/90 bg-teal-50/50',
  REVISION: 'text-indigo-600/90 bg-indigo-50/50',
  SAVING: 'text-sky-600/90 bg-sky-50/50',
  COMPLETED: 'text-emerald-600/90 bg-emerald-50/50',
  ERROR: 'text-red-600/90 bg-red-50/50',
};

const stepLabels: Record<LogStep, string> = {
  INIT: 'Hazırlık',
  MAPPING: 'Analiz',
  GENERATING: 'Üretim',
  VALIDATING: 'Denetim',
  REVISION: 'İnce Ayar',
  SAVING: 'Kaydediliyor',
  COMPLETED: 'Tamamlandı',
  ERROR: 'Aksaklık',
};

interface GenerationLiveStreamProps {
  logs: GenerationLog[];
}

export const GenerationLiveStream: React.FC<GenerationLiveStreamProps> = ({
  logs,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="flex-1 overflow-hidden border border-border/50 rounded-lg bg-muted/20">
      <div className="p-2 border-b border-border/30 bg-muted/30 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Hazırlık Süreci
        </span>
        <span className="text-xs text-muted-foreground">
          {logs.length} adım
        </span>
      </div>
      <div
        ref={logContainerRef}
        className="p-2 space-y-2 max-h-[450px] overflow-y-auto"
      >
        {logs.map((log) => (
          <div
            key={log.id}
            className={`flex items-start gap-2 p-2 rounded-md text-xs ${stepColors[log.step]}`}
          >
            <span className="mt-0.5 shrink-0">{stepIcons[log.step]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{stepLabels[log.step]}</span>
                <span className="text-muted-foreground text-[10px]">
                  {log.timestamp.toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
              <span className="opacity-80 block mt-0.5">{log.message}</span>
              {log.details && Object.keys(log.details).length > 0 && (
                <details className="mt-1">
                  <summary className="text-[10px] cursor-pointer opacity-70 hover:opacity-100">
                    Detaylar
                  </summary>
                  <ul className="mt-1 text-[10px] opacity-75 space-y-0.5">
                    {Object.entries(log.details).map(([key, value]) => (
                      <li key={key}>
                        <span className="capitalize">{key}:</span>{' '}
                        {String(value)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
