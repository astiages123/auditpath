import React, { useRef } from 'react';
import {
  BookOpen,
  ChevronRight,
  Zap,
  Coffee,
  Pause as PauseIcon,
  LayoutGrid,
  Clock,
  Maximize2,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/utils/core';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/shared/components/GlassCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { calculateFocusPower } from '@/features/efficiency/logic/metricsCalc';
import { RecentSession } from '@/features/pomodoro/types/pomodoroTypes';
import { Session, FocusPowerPoint } from '../types/efficiencyTypes';
import { EfficiencyModal } from './EfficiencyModals';
import { SessionGanttChart } from './SessionGanttChart';
import { EfficiencyChartTab } from './EfficiencyChartTab';
import { useCognitiveInsights } from '../hooks/useCognitiveInsights';
import { useEfficiencyTrends } from '../hooks/useEfficiencyTrends';

// --- Utils ---

const convertToSession = (rs: RecentSession): Session => {
  const start = new Date(rs.date);
  const end = new Date(start.getTime() + rs.durationMinutes * 60000);

  const timeline = (
    rs.timeline as {
      type: string;
      start: string | number;
      end: string | number;
    }[]
  ).map((t) => {
    const bStart = new Date(t.start).getTime();
    const bEnd = new Date(t.end).getTime();
    return {
      type: t.type || 'work',
      start: bStart,
      end: bEnd,
      duration: Math.round((bEnd - bStart) / 1000 / 60),
    };
  });

  return {
    id: rs.id,
    lessonName: rs.courseName,
    date: start.toISOString().split('T')[0],
    startTime: start.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    endTime: end.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    duration: rs.durationMinutes,
    timeline: timeline,
    pauseIntervals: [],
  };
};

// --- Sub-components ---

const StatCard = ({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}) => (
  <div className="p-4 rounded-xl bg-white/3 border border-white/5 flex flex-col items-center justify-center text-center">
    <div className={cn('p-2 rounded-lg mb-2', iconBg)}>
      <Icon className={cn('w-4 h-4', iconColor)} />
    </div>
    <div className="text-xs text-muted-foreground/70 uppercase mb-0.5">
      {label}
    </div>
    <div className="text-base font-semibold text-white">{value}</div>
  </div>
);

interface SessionListItemProps {
  session: RecentSession;
  disableModal?: boolean;
}

export const SessionListItem: React.FC<SessionListItemProps> = ({
  session,
  disableModal = false,
}) => {
  const dateObj = new Date(session.date);
  const formattedDate = dateObj.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
  });
  const formattedTime = dateObj.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const getEfficiencyColor = (score: number) => {
    if (score >= 100) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    if (score > 0) return 'text-rose-400';
    return 'text-muted-foreground';
  };

  const focusPower = calculateFocusPower(
    session.totalWorkTime,
    session.totalBreakTime,
    session.totalPauseTime
  );

  const TriggerContent = (
    <div className="p-4 flex items-center justify-between bg-white/2 border border-white/5 hover:bg-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="text-left flex flex-col gap-0.5">
          <h4 className="text-base font-medium text-white/90 leading-tight">
            {session.courseName}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <span>{formattedDate}</span>
            <span className="text-muted-foreground/30">•</span>
            <span>{formattedTime}</span>
            <span className="text-muted-foreground/30">•</span>
            <span>{session.durationMinutes} dk</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter mb-0.5">
            Odak Gücü
          </span>
          <span
            className={cn(
              'text-base font-semibold',
              getEfficiencyColor(focusPower)
            )}
          >
            {focusPower}
          </span>
        </div>
        {!disableModal && (
          <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-white/60 transition-colors" />
        )}
      </div>
    </div>
  );

  if (disableModal) {
    return <div className="w-full">{TriggerContent}</div>;
  }

  const workMins = Math.round(session.totalWorkTime / 60);
  const breakMins = Math.round(session.totalBreakTime / 60);
  const pauseMins = Math.round(session.totalPauseTime / 60);

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-full">
      <EfficiencyModal
        title={`${session.courseName} - Oturum Detayı`}
        trigger={TriggerContent}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Oturum Akışı
            </h5>
            <div className="bg-white/3 p-5 rounded-xl border border-white/5">
              <SessionGanttChart
                sessions={[convertToSession(session)]}
                detailed={true}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={LayoutGrid}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              label="Durdurma"
              value={`${session.pauseCount} Adet`}
            />
            <StatCard
              icon={Zap}
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-400"
              label="Odaklanma"
              value={`${workMins} dk`}
            />
            <StatCard
              icon={Coffee}
              iconBg="bg-sky-500/10"
              iconColor="text-sky-400"
              label="Mola"
              value={`${breakMins} dk`}
            />
            <StatCard
              icon={PauseIcon}
              iconBg="bg-zinc-500/10"
              iconColor="text-zinc-400"
              label="Duraklatma"
              value={`${pauseMins} dk`}
            />
          </div>

          <div className="bg-white/3 rounded-xl p-5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Odak Gücü
              </span>
              <span
                className={cn(
                  'text-xl font-bold',
                  getEfficiencyColor(focusPower)
                )}
              >
                {focusPower}{' '}
                <span className="text-xs font-medium opacity-50 uppercase tracking-normal">
                  puan
                </span>
              </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-700 rounded-full',
                  focusPower >= 100
                    ? 'bg-emerald-500'
                    : focusPower >= 70
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                )}
                style={{ width: `${Math.min(100, focusPower)}%` }}
              />
            </div>
          </div>
        </div>
      </EfficiencyModal>
    </div>
  );
};

interface RecentActivitiesCardProps {
  sessions: RecentSession[];
  focusPowerWeek: FocusPowerPoint[];
  focusPowerMonth: FocusPowerPoint[];
  focusPowerAll: FocusPowerPoint[];
}

export const RecentActivitiesCard = (props: RecentActivitiesCardProps) => {
  const { sessions } = props;
  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 5,
  });

  const displaySessions = sessions.slice(0, 5);

  if (sessions.length === 0) {
    return (
      <GlassCard className="p-8 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-white/5 rounded-xl">
          <BookOpen className="w-6 h-6 text-muted-foreground/50" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-medium text-white/80">
            Henüz Çalışma Yok
          </h3>
          <p className="text-sm text-muted-foreground/60">
            Son zamanlarda tamamlanan bir çalışma bulunamadı.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <EfficiencyModal
      title="Tüm Çalışma Geçmişi ve Analizler"
      trigger={
        <div className="h-full w-full">
          <GlassCard className="flex flex-col overflow-hidden relative group h-full cursor-pointer">
            <div className="p-5 px-6 border-b border-white/5 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-sky-500/10">
                  <Clock className="w-5 h-5 text-sky-400" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-semibold text-white tracking-wide">
                    Son Çalışmalar
                  </span>
                  <span className="text-xs text-muted-foreground/80">
                    Tamamlanan son oturumlar
                  </span>
                </div>
              </div>
              <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
            </div>

            <div className="py-4 px-6 space-y-2.5">
              {displaySessions.map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  disableModal={true}
                />
              ))}
            </div>
          </GlassCard>
        </div>
      }
    >
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="list">Liste Görünümü</TabsTrigger>
          <TabsTrigger value="chart">Odak Gücü Grafiği</TabsTrigger>
        </TabsList>

        <TabsContent
          value="list"
          className="max-h-[70vh] overflow-y-auto custom-scrollbar p-1"
          ref={parentRef}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="py-1"
              >
                <SessionListItem session={sessions[virtualItem.index]} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="chart" className="min-h-[400px]">
          <EfficiencyChartTab
            weekData={props.focusPowerWeek}
            monthData={props.focusPowerMonth}
            allData={props.focusPowerAll}
          />
        </TabsContent>
      </Tabs>
    </EfficiencyModal>
  );
};

// --- Container (Main export) ---

export const RecentActivitiesContainer = () => {
  const { loading: loadingInsights, recentSessions } = useCognitiveInsights();
  const {
    loading: loadingTrends,
    focusPowerWeek,
    focusPowerMonth,
    focusPowerAll,
  } = useEfficiencyTrends();

  const loading = loadingInsights || loadingTrends;

  if (loading)
    return (
      <GlassCard className="h-full flex flex-col p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl bg-white/5" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-white/5" />
              <Skeleton className="h-3 w-48 bg-white/5" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3 mt-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-lg border border-white/5"
            >
              <Skeleton className="h-10 w-10 rounded-full bg-white/5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 bg-white/5" />
                <Skeleton className="h-3 w-24 bg-white/5" />
              </div>
              <Skeleton className="h-6 w-16 bg-white/5" />
            </div>
          ))}
        </div>
      </GlassCard>
    );

  return (
    <div className="h-full w-full">
      <RecentActivitiesCard
        sessions={recentSessions}
        focusPowerWeek={focusPowerWeek}
        focusPowerMonth={focusPowerMonth}
        focusPowerAll={focusPowerAll}
      />
    </div>
  );
};
