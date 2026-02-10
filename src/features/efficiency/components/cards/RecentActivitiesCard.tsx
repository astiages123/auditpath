import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/components/ui/tabs';
import { FocusPowerTrendChart } from '../visuals/EfficiencyCharts';
import { FocusPowerPoint, Session } from '../../types';
import { useState } from 'react';
import { EfficiencyModal } from '../modals/EfficiencyModals';
import { Zap, Coffee, Pause as PauseIcon, LayoutGrid } from 'lucide-react';
import { calculateFocusPower } from '@/shared/lib/core/utils/efficiency-math';
import { GlassCard } from '../../../../shared/components/GlassCard';
import { Clock, BookOpen, ChevronRight, Maximize2 } from 'lucide-react';
import { RecentSession } from '@/shared/types/efficiency';
import { SessionGanttChart } from '../visuals/EfficiencyCharts';
import { cn } from '@/shared/lib/core/utils';

interface RecentActivitiesCardProps {
  sessions: RecentSession[];
  focusPowerWeek: FocusPowerPoint[];
  focusPowerMonth: FocusPowerPoint[];
  focusPowerAll: FocusPowerPoint[];
}

const SessionListItem = ({
  session,
  convertToSession,
  disableModal = false,
}: {
  session: RecentSession;
  convertToSession: (rs: RecentSession) => Session;
  disableModal?: boolean;
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
          <span
            className={cn(
              'text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter mb-0.5'
            )}
          >
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

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-full">
      <EfficiencyModal
        title={`${session.courseName} - Oturum Detayı`}
        trigger={TriggerContent}
      >
        {(() => {
          const workMins = Math.round(session.totalWorkTime / 60);
          const breakMins = Math.round(session.totalBreakTime / 60);
          const pauseMins = Math.round(session.totalPauseTime / 60);

          return (
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
          );
        })()}
      </EfficiencyModal>
    </div>
  );
};

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

const ChartTabContent = ({
  weekData,
  monthData,
  allData,
}: {
  weekData: FocusPowerPoint[];
  monthData: FocusPowerPoint[];
  allData: FocusPowerPoint[];
}) => {
  const [range, setRange] = useState<'week' | 'month' | 'all'>('week');

  const getData = () => {
    switch (range) {
      case 'week':
        return weekData;
      case 'month':
        return monthData;
      case 'all':
        return allData;
      default:
        return weekData;
    }
  };

  const getLabel = () => {
    switch (range) {
      case 'week':
        return 'Son 7 Gün';
      case 'month':
        return 'Son 30 Gün';
      case 'all':
        return 'Tüm Zamanlar';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4 bg-white/5 rounded-xl p-4 border border-white/5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Odak Gücü Trendi
          </h4>
          <span className="text-xs text-muted-foreground">
            {getLabel()} Performansı
          </span>
        </div>
        <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setRange('week')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              range === 'week'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-muted-foreground hover:text-white/80'
            )}
          >
            Hafta
          </button>
          <button
            onClick={() => setRange('month')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              range === 'month'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-muted-foreground hover:text-white/80'
            )}
          >
            Ay
          </button>
          <button
            onClick={() => setRange('all')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              range === 'all'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-muted-foreground hover:text-white/80'
            )}
          >
            Tümü
          </button>
        </div>
      </div>

      <div className="h-[350px] w-full bg-black/10 rounded-lg border border-white/5 p-2">
        <FocusPowerTrendChart data={getData()} rangeLabel={range} />
      </div>
    </div>
  );
};

export const RecentActivitiesCard = (props: RecentActivitiesCardProps) => {
  const { sessions } = props;
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
                  convertToSession={convertToSession}
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
          className="space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar p-1"
        >
          {sessions.map((session) => (
            <SessionListItem
              key={session.id}
              session={session}
              convertToSession={convertToSession}
            />
          ))}
        </TabsContent>

        <TabsContent value="chart" className="min-h-[400px]">
          <ChartTabContent
            weekData={props.focusPowerWeek}
            monthData={props.focusPowerMonth}
            allData={props.focusPowerAll}
          />
        </TabsContent>
      </Tabs>
    </EfficiencyModal>
  );
};
