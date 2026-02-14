import React from 'react';
import {
  EfficiencyModal,
  FocusHubContent,
  LearningLoadContent,
  PracticeCenterContent,
  MasteryNavigatorContent,
} from './EfficiencyModals';
import {
  BloomKeyChart,
  GoalProgressRing,
  LearningLoadChart,
} from './EfficiencyCharts';
import { useEfficiency } from '../hooks';
import { EfficiencyHeatmap } from './EfficiencyHeatmap';
import {
  BookOpen,
  Target,
  Zap,
  Calendar,
  LayoutGrid,
  TrendingUp,
  TrendingDown,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/utils/core';
import { RecentActivitiesCard } from './RecentActivitiesCard';
import { GlassCard } from '@/shared/GlassCard';
import {
  EfficiencyTrend,
  RecentSession,
  LearningLoad,
  BloomStats,
  DayActivity,
  FocusPowerPoint,
  Session,
} from '../types';
import { Skeleton } from '@/components/ui/skeleton';

const DEFAULT_DAILY_GOAL_MINUTES = 200;

export interface EfficiencyData {
  loading: boolean;
  currentWorkMinutes: number;
  todayVideoMinutes: number;
  todayVideoCount: number;
  videoTrendPercentage: number;
  sessions: Session[]; // Changed from RecentSession[] to Session[] to match usage
  dailyGoalMinutes: number;
  efficiencyTrend: EfficiencyTrend[];
  trendPercentage: number;
  learningFlow: number;
  flowState: string;
  goalProgress: number;
  loadWeek: LearningLoad[];
  loadDay: LearningLoad[];
  loadMonth: LearningLoad[];
  loadAll: LearningLoad[];
  bloomStats: BloomStats[];
  lessonMastery: {
    lessonId: string;
    title: string;
    mastery: number;
    videoProgress: number;
    questionProgress: number;
  }[];
  consistencyData: DayActivity[];
  recentSessions: RecentSession[];
  focusPowerWeek: FocusPowerPoint[];
  focusPowerMonth: FocusPowerPoint[];
  focusPowerAll: FocusPowerPoint[];
}

const FLOW_STATE_CONFIG = {
  optimal: { color: 'text-emerald-400', label: 'Optimal Akış / Denge' },
  deep: { color: 'text-amber-400', label: 'Yoğun ve Derin İnceleme' },
  speed: { color: 'text-amber-400', label: 'Seri Tarama / Hızlı İlerleme' },
  stuck: { color: 'text-rose-500', label: 'Yüksek Zaman Maliyeti / Takılma' },
  shallow: { color: 'text-rose-500', label: 'Çok Hızlı / Olası Yüzeysellik' },
} as const;

// Reusable Trend Badge component
const TrendBadge = ({ percentage }: { percentage: number }) => {
  if (percentage === 0) return null;

  const isPositive = percentage > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
        isPositive
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-rose-500/15 text-rose-400'
      )}
    >
      <TrendIcon className="w-2.5 h-2.5" />
      <span>%{Math.abs(percentage)}</span>
    </div>
  );
};

// Helper functions for flow state (defined outside component)
const getFlowColor = (flowState: string) =>
  FLOW_STATE_CONFIG[flowState as keyof typeof FLOW_STATE_CONFIG]?.color ||
  'text-rose-500';

const getFlowStatusLabel = (flowState: string) =>
  FLOW_STATE_CONFIG[flowState as keyof typeof FLOW_STATE_CONFIG]?.label || '';

// Shared CardHeader component for consistency
export const CardHeader = React.memo(
  ({
    icon: Icon,
    iconColor = 'text-primary',
    iconBg = 'bg-primary/10',
    title,
    subtitle,
    badge,
    action,
  }: {
    icon: React.ElementType;
    iconColor?: string;
    iconBg?: string;
    title: string;
    subtitle: string;
    badge?: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-4">
        <div className={cn('p-2.5 rounded-xl', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold text-white tracking-wide">
            {title}
          </span>
          <span className="text-xs text-muted-foreground/80">{subtitle}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {badge}
        {action}
      </div>
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendLabel?: string;
  className?: string;
  loading?: boolean;
}

export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  className,
  loading,
}: StatCardProps) => {
  if (loading) {
    return (
      <div
        className={cn(
          'p-4 rounded-2xl bg-[#1a1c1e] border border-white/5',
          className
        )}
      >
        <div className="flex justify-between items-start mb-2">
          <Skeleton className="h-4 w-24 bg-white/5" />
          {icon && <Skeleton className="h-8 w-8 rounded-full bg-white/5" />}
        </div>
        <Skeleton className="h-8 w-16 mb-2 bg-white/5" />
        <Skeleton className="h-4 w-32 bg-white/5" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-2xl bg-[#1a1c1e] border border-white/5 hover:border-white/10 transition-colors',
        className
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        {icon && (
          <div className="p-2 bg-white/5 rounded-lg text-white/80">{icon}</div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white font-heading">
          {value}
        </span>
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
      </div>
      {(trend || trendLabel) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                'font-medium px-1.5 py-0.5 rounded',
                trend.startsWith('+')
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              )}
            >
              {trend}
            </span>
          )}
          {trendLabel && <span className="text-slate-500">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
};

interface FocusHubCardProps {
  data: EfficiencyData;
}

export const FocusHubCard = ({ data }: FocusHubCardProps) => {
  const {
    loading,
    currentWorkMinutes,
    todayVideoMinutes,
    todayVideoCount,
    videoTrendPercentage,
    sessions,
    dailyGoalMinutes,
    efficiencyTrend,
    trendPercentage,
    learningFlow,
    flowState,
    goalProgress,
  } = data;

  const dailyGoal = dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES;

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
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 mt-6">
          <Skeleton className="h-40 w-40 rounded-full bg-white/5 shrink-0" />
          <div className="space-y-4 w-full md:w-auto flex flex-col items-center md:items-start">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 bg-white/5" />
              <Skeleton className="h-10 w-48 bg-white/5" />
            </div>
            <div className="space-y-2 w-full">
              <Skeleton className="h-16 w-full md:w-48 bg-white/5 rounded-lg" />
              <Skeleton className="h-16 w-full md:w-48 bg-white/5 rounded-lg" />
            </div>
          </div>
        </div>
      </GlassCard>
    );

  return (
    <EfficiencyModal
      title="Öğrenme Akışı Analizi"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <GlassCard className="h-full flex flex-col p-6">
            <CardHeader
              icon={Target}
              iconColor="text-emerald-400"
              iconBg="bg-emerald-500/10"
              title="Öğrenme Akışı"
              subtitle="Video hızı ve çalışma süresi oranı. İdeal: 1.0x"
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />

            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 mt-6">
              <GoalProgressRing
                progress={goalProgress}
                size={160}
                strokeWidth={12}
              />

              <div className="text-center md:text-left space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Öğrenme Akışı
                  </p>
                  <div className="flex flex-col md:flex-row md:items-baseline gap-x-3 gap-y-1 justify-center md:justify-start">
                    <p
                      className={cn(
                        'text-4xl font-bold font-heading',
                        getFlowColor(flowState)
                      )}
                    >
                      {learningFlow.toFixed(2)}x
                    </p>
                    <p
                      className={cn(
                        'text-[11px] font-bold tracking-wide lowercase',
                        getFlowColor(flowState),
                        'opacity-90'
                      )}
                    >
                      {getFlowStatusLabel(flowState)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        Günlük Odak
                      </p>
                      <TrendBadge percentage={trendPercentage} />
                    </div>
                    <p className="text-lg font-mono text-white">
                      {currentWorkMinutes}
                      <span className="text-muted-foreground/40 text-sm">
                        {' '}
                        / {dailyGoal}dk
                      </span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        Video İzleme
                      </p>
                      <TrendBadge percentage={videoTrendPercentage} />
                    </div>
                    <p className="text-lg font-mono text-white">
                      {todayVideoCount}
                      <span className="text-muted-foreground/40 text-sm">
                        {' '}
                        video
                      </span>
                    </p>
                    <p className="text-[12px] text-muted-foreground/60">
                      {todayVideoMinutes} dk toplam
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      }
    >
      <FocusHubContent trendData={efficiencyTrend} sessions={sessions} />
    </EfficiencyModal>
  );
};

// 2. Learning Load Card
interface LearningLoadCardProps {
  data: EfficiencyData;
}

export const LearningLoadCard = ({ data }: LearningLoadCardProps) => {
  const { loading, loadWeek, loadDay, loadMonth, loadAll, dailyGoalMinutes } =
    data;

  const dailyGoal = dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES;

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
        <div className="flex-1 w-full min-h-0 mt-4 flex items-end gap-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-lg bg-white/5"
              style={{
                height: `${Math.random() * 60 + 20}%`,
              }}
            />
          ))}
        </div>
      </GlassCard>
    );

  return (
    <EfficiencyModal
      title="Odaklanma Trendi"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <GlassCard className="h-full flex flex-col p-6">
            <CardHeader
              icon={BookOpen}
              iconColor="text-sky-400"
              iconBg="bg-sky-500/10"
              title="Odaklanma Trendi"
              subtitle="Son 7 günlük çalışma aktivitesi"
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />
            <div className="flex-1 w-full min-h-0 mt-4">
              <LearningLoadChart data={loadWeek} targetMinutes={dailyGoal} />
            </div>
          </GlassCard>
        </div>
      }
    >
      <LearningLoadContent
        dayData={loadDay}
        weekData={loadWeek}
        monthData={loadMonth}
        allData={loadAll}
        targetMinutes={dailyGoal}
      />
    </EfficiencyModal>
  );
};

// 3. Practice Center Card
interface PracticeCenterCardProps {
  data: EfficiencyData;
}

export const PracticeCenterCard = ({ data }: PracticeCenterCardProps) => {
  const { loading, bloomStats } = data;

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
        <div className="flex-1 w-full flex items-center justify-center">
          <Skeleton className="h-48 w-48 rounded-full bg-white/5" />
        </div>
      </GlassCard>
    );

  return (
    <EfficiencyModal
      title="Pratik Merkezi İstatistikleri"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <GlassCard className="h-full flex flex-col p-6">
            <CardHeader
              icon={Zap}
              iconColor="text-amber-400"
              iconBg="bg-amber-500/10"
              title="Pratik Merkezi"
              subtitle="Soru çözümü ve seviye analizi"
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />

            <div className="flex-1 w-full flex items-center justify-center min-h-0">
              <div className="w-full h-full flex items-center justify-center p-2">
                <BloomKeyChart data={bloomStats} />
              </div>
            </div>
          </GlassCard>
        </div>
      }
    >
      <PracticeCenterContent>
        <BloomKeyChart data={bloomStats} />
      </PracticeCenterContent>
    </EfficiencyModal>
  );
};

// 4. Mastery Navigator Card
interface MasteryNavigatorCardProps {
  data: EfficiencyData;
}

export const MasteryNavigatorCard = ({ data }: MasteryNavigatorCardProps) => {
  const { loading, lessonMastery } = data;

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
        <div className="flex-1 space-y-3 mt-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-white/3 border border-white/5"
            >
              <div className="flex justify-between mb-2">
                <Skeleton className="h-4 w-24 bg-white/5" />
                <Skeleton className="h-4 w-8 bg-white/5" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full bg-white/5" />
            </div>
          ))}
        </div>
      </GlassCard>
    );

  return (
    <EfficiencyModal
      title="Ders Ustalığı ve İlerleme"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <GlassCard className="h-full flex flex-col p-6 overflow-hidden">
            <CardHeader
              icon={LayoutGrid}
              iconColor="text-violet-400"
              iconBg="bg-violet-500/10"
              title="Ustalık İlerlemesi"
              subtitle="En başarılı dersleriniz"
              badge={
                <div className="text-xs font-mono text-muted-foreground bg-white/5 px-2.5 py-1 rounded-lg">
                  {lessonMastery.length} ders
                </div>
              }
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />

            <div className="flex-1 space-y-3 mt-6 overflow-y-auto pr-1 custom-scrollbar">
              {lessonMastery.length > 0 ? (
                lessonMastery.slice(0, 5).map((lesson) => (
                  <div
                    key={lesson.lessonId}
                    className="p-3.5 rounded-xl bg-white/3 border border-white/5 hover:bg-white/6 hover:border-white/10 transition-all"
                  >
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-sm font-medium truncate pr-2 text-white/90">
                        {lesson.title}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        %{lesson.mastery}
                      </span>
                    </div>

                    <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-linear-to-r from-primary/80 to-primary rounded-full transition-all duration-700"
                        style={{ width: `${lesson.mastery}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Henüz ders verisi bulunmuyor.
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      }
    >
      <MasteryNavigatorContent sessions={lessonMastery} />
    </EfficiencyModal>
  );
};

// 5. Consistency Heatmap Card
interface ConsistencyHeatmapCardProps {
  data: EfficiencyData;
}

export const ConsistencyHeatmapCard = ({
  data,
}: ConsistencyHeatmapCardProps) => {
  const { loading, consistencyData } = data;

  if (loading)
    return (
      <GlassCard className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl bg-white/5" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-white/5" />
              <Skeleton className="h-3 w-48 bg-white/5" />
            </div>
          </div>
        </div>
        <div className="flex-1 bg-white/2 rounded-xl p-5 mt-5 border border-white/5 flex flex-wrap gap-2">
          {[...Array(30)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-md bg-white/5" />
          ))}
        </div>
      </GlassCard>
    );

  return (
    <GlassCard className="p-6 flex flex-col h-full">
      <CardHeader
        icon={Calendar}
        iconColor="text-emerald-400"
        iconBg="bg-emerald-500/10"
        title="Tutarlılık Analizi"
        subtitle="Son 30 günlük çalışma disiplini"
      />

      <div className="flex-1 flex items-center justify-center bg-white/2 rounded-xl p-5 mt-5 border border-white/5 h-full">
        <div className="w-full h-full">
          <EfficiencyHeatmap data={consistencyData} />
        </div>
      </div>
    </GlassCard>
  );
};

// 6. Recent Activities Container
interface RecentActivitiesContainerProps {
  data: EfficiencyData;
}

export const RecentActivitiesContainer = ({
  data,
}: RecentActivitiesContainerProps) => {
  const {
    loading,
    recentSessions,
    focusPowerWeek,
    focusPowerMonth,
    focusPowerAll,
  } = data;

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
