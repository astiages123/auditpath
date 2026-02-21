import { useEffect, useRef, FC, ReactNode } from 'react';
import {
  Target,
  Trophy,
  HelpCircle,
  Box,
  Brain,
  Zap,
  AlertCircle,
  Sparkles,
  Coffee,
  Map as MapIcon,
  PenTool,
  SearchCheck,
  Wand2,
  Library,
  CircleCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GenerationLog, GenerationStep } from '@/features/quiz/types';
import { cn } from '@/utils/stringHelpers';

// ============================================================================
// Course Overview (formerly CourseOverview.tsx)
// ============================================================================

interface CourseOverviewProps {
  courseName: string;
  progress: {
    total: number;
    solved: number;
    percentage: number;
  } | null;
}

export function CourseOverview({ courseName, progress }: CourseOverviewProps) {
  const stats = [
    {
      label: 'Ders İlerlemesi',
      value: progress ? `%${progress.percentage}` : '...',
      icon: Target,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Çözülen Soru',
      value: progress ? `${progress.solved} / ${progress.total}` : '...',
      icon: HelpCircle,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="flex-col flex-center p-8 h-full space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex-center mb-6">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Başlamaya Hazır Mısın?
          </h2>
          <p className="text-muted-foreground text-base">
            {courseName} dersindeki durumunu incele ve bir konu seçerek başla.
          </p>
        </motion.div>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card border border-border/50 p-4 rounded-2xl flex items-center gap-4 hover:border-border/80 transition-colors"
          >
            <div className={cn('p-3 rounded-xl', stat.bg, stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
              <div className="text-xl font-bold">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Quota Display (formerly QuotaDisplay.tsx)
// ============================================================================

interface QuotaDisplayProps {
  displayedUsed: number;
  displayedQuota: number;
  loading: boolean;
  savedCount: number;
  progress: number;
  percentage: number;
  currentStep?: string;
  conceptCount: number;
}

export const QuotaDisplay: FC<QuotaDisplayProps> = ({
  displayedUsed,
  displayedQuota,
  loading,
  savedCount,
  progress,
  percentage,
  currentStep,
  conceptCount,
}) => (
  <div className="space-y-4">
    <div className="space-y-3">
      <div className="flex-between text-sm">
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
        indicatorClassName={cn(
          loading ? 'bg-yellow-500 transition-all duration-500' : 'bg-blue-600'
        )}
      />
      {loading && currentStep && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="w-3 h-3 text-yellow-500 animate-pulse" />
          <span className="font-medium">{currentStep}</span>
        </div>
      )}
    </div>
    <div className="grid grid-cols-1 gap-4">
      <div className="rounded-xl bg-muted/50 p-6 flex-col flex-center gap-2 border border-border/50">
        <Brain className="w-6 h-6 text-purple-500 mb-1" />
        <span className="text-muted-foreground text-sm font-medium">
          Tespit Edilen Kavram
        </span>
        <span className="font-mono text-foreground text-3xl font-bold tracking-tight">
          {conceptCount}
        </span>
      </div>
    </div>
  </div>
);

// ============================================================================
// Initial State View (formerly InitialStateView.tsx)
// ============================================================================

interface InitialStateViewProps {
  onGenerate: () => void;
}

export function InitialStateView({ onGenerate }: InitialStateViewProps) {
  return (
    <div className="flex-1 flex-col flex-center w-full min-h-full">
      <div className="w-full max-w-md space-y-6 flex flex-col items-center text-center">
        <div className="w-full p-8 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <div className="space-y-2">
            <h4 className="text-xl font-bold text-amber-600 tracking-tight">
              Bu Konuyu Henüz Keşfetmedik
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bu bölümdeki kavramları ve zorluk seviyesini senin için henüz
              analiz etmedim. Hemen başlayıp senin için en uygun antrenmanı
              hazırlayabilirim.
            </p>
          </div>
        </div>
        <Button
          size="lg"
          className="w-full h-14 text-lg font-bold gap-2 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
          onClick={onGenerate}
        >
          <Sparkles className="w-5 h-5" /> Analiz Et ve Soruları Hazırla
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Generation Live Stream (formerly GenerationLiveStream.tsx)
// ============================================================================

const stepIcons: Record<GenerationStep, ReactNode> = {
  INIT: <Coffee className="w-3.5 h-3.5" />,
  MAPPING: <MapIcon className="w-3.5 h-3.5" />,
  GENERATING: <PenTool className="w-3.5 h-3.5" />,
  VALIDATING: <SearchCheck className="w-3.5 h-3.5" />,
  REVISION: <Wand2 className="w-3.5 h-3.5" />,
  SAVING: <Library className="w-3.5 h-3.5" />,
  COMPLETED: <CircleCheck className="w-3.5 h-3.5" />,
  ERROR: <AlertCircle className="w-3.5 h-3.5" />,
};

const stepColors: Record<GenerationStep, string> = {
  INIT: 'text-amber-600/90 bg-amber-50/50',
  MAPPING: 'text-violet-600/90 bg-violet-50/50',
  GENERATING: 'text-rose-600/90 bg-rose-50/50',
  VALIDATING: 'text-teal-600/90 bg-teal-50/50',
  REVISION: 'text-indigo-600/90 bg-indigo-50/50',
  SAVING: 'text-sky-600/90 bg-sky-50/50',
  COMPLETED: 'text-emerald-600/90 bg-emerald-50/50',
  ERROR: 'text-red-600/90 bg-red-50/50',
};

const stepLabels: Record<GenerationStep, string> = {
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

export const GenerationLiveStream: FC<GenerationLiveStreamProps> = ({
  logs,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="flex-1 overflow-hidden border border-border/50 rounded-lg bg-muted/20">
      <div className="p-2 border-b border-border/30 bg-muted/30 flex-between">
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
            className={cn(
              'flex items-start gap-2 p-2 rounded-md text-xs',
              stepColors[log.step]
            )}
          >
            <span className="mt-0.5 shrink-0">{stepIcons[log.step]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{stepLabels[log.step]}</span>
                <span className="text-muted-foreground text-[10px]">
                  {new Date(log.timestamp).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
              <span className="opacity-80 block mt-0.5">{log.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
