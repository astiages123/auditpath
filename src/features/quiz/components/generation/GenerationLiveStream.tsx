import React, { useRef, useEffect } from 'react';
import {
  type GenerationLog,
  type GenerationStep as LogStep,
} from '@/features/quiz/logic';
import {
  Sparkles,
  Box,
  CheckCircle,
  AlertCircle,
  Brain,
  Shield,
  Database,
} from 'lucide-react';

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
          Üretim Logları
        </span>
        <span className="text-xs text-muted-foreground">{logs.length} log</span>
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
            <span className="mt-0.5 shrink-0">{stepIcons[log.step]}</span>
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
              <span className="opacity-90 block mt-0.5">{log.message}</span>
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
  );
};
