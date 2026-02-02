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
  SessionGanttChart,
} from './EfficiencyCharts';
import { useEfficiencyLogic } from './useEfficiencyLogic';
import { useEfficiencyData } from './useEfficiencyData';
import { EfficiencyHeatmap } from './EfficiencyHeatmap';
import { 
  BookOpen, 
  Target, 
  Zap, 
  Loader2, 
  Calendar, 
  LayoutGrid, 
  TrendingUp, 
  TrendingDown,
  Maximize2
} from 'lucide-react';
import { cn } from '@/shared/lib/core/utils';
import { RecentActivitiesCard } from './RecentActivitiesCard';
import { GlassCard } from "../../shared/components/GlassCard";

// Shared CardHeader component for consistency
export const CardHeader = ({ 
  icon: Icon, 
  iconColor = "text-primary", 
  iconBg = "bg-primary/10",
  title, 
  subtitle,
  badge,
  action
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
      <div className={cn("p-2.5 rounded-xl", iconBg)}>
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-base font-semibold text-white tracking-wide">
          {title}
        </span>
        <span className="text-xs text-muted-foreground/80">
          {subtitle}
        </span>
      </div>
    </div>
    <div className="flex items-center gap-3">
      {badge}
      {action}
    </div>
  </div>
);

const LoadingState = () => (
  <div className="h-full w-full flex items-center justify-center text-muted-foreground/50">
    <Loader2 className="w-8 h-8 animate-spin" />
  </div>
);

// 1. Focus Hub Card
export const FocusHubCard = () => {
    const { 
    loading, 
    currentWorkMinutes, 
    todayVideoMinutes, 
    todayVideoCount,
    videoTrendPercentage,
    sessions, 
    dailyGoalMinutes,
    efficiencyTrend,
    trendPercentage
  } = useEfficiencyData();

  const { effectivenessScore, goalProgress, isWarning, goalMinutes } = useEfficiencyLogic({
    totalVideoTime: todayVideoMinutes,
    totalPomodoroTime: currentWorkMinutes, 
  });

  if (loading) return <GlassCard className="h-full"><LoadingState /></GlassCard>;

  return (
    <EfficiencyModal
      title="Odak Merkezi Analizi"
      trigger={
        <div className="h-full w-full">
          <GlassCard className="h-full flex flex-col p-6">
            <CardHeader 
              icon={Target}
              iconColor="text-emerald-400"
              iconBg="bg-emerald-500/10"
              title="Odak Merkezi"
              subtitle="Günlük hedef ve efektiflik analizi"
              action={<Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />}
            />
            
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 mt-6">
              <GoalProgressRing progress={goalProgress} size={160} strokeWidth={12} />
              
              <div className="text-center md:text-left space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Efektiflik Skoru</p>
                  <p className={cn(
                    "text-4xl font-bold font-heading",
                    isWarning ? "text-amber-400" : "text-emerald-400"
                  )}>
                    %{effectivenessScore}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Günlük Odak</p>
                            {trendPercentage !== 0 && (
                            <div className={cn(
                                "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                                trendPercentage > 0 
                                ? "bg-emerald-500/15 text-emerald-400" 
                                : "bg-rose-500/15 text-rose-400"
                            )}>
                                {trendPercentage > 0 
                                ? <TrendingUp className="w-2.5 h-2.5" /> 
                                : <TrendingDown className="w-2.5 h-2.5" />
                                }
                                <span>%{Math.abs(trendPercentage)}</span>
                            </div>
                            )}
                        </div>
                        <p className="text-lg font-mono text-white">
                            {currentWorkMinutes}<span className="text-muted-foreground/40 text-sm"> / {dailyGoalMinutes}dk</span>
                        </p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Video İzleme</p>
                            {videoTrendPercentage !== 0 && (
                            <div className={cn(
                                "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                                videoTrendPercentage > 0 
                                ? "bg-emerald-500/15 text-emerald-400" 
                                : "bg-rose-500/15 text-rose-400"
                            )}>
                                {videoTrendPercentage > 0 
                                ? <TrendingUp className="w-2.5 h-2.5" /> 
                                : <TrendingDown className="w-2.5 h-2.5" />
                                }
                                <span>%{Math.abs(videoTrendPercentage)}</span>
                            </div>
                            )}
                        </div>
                        <p className="text-lg font-mono text-white">
                            {todayVideoCount}<span className="text-muted-foreground/40 text-sm"> video</span>
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
      <FocusHubContent trendData={efficiencyTrend}>
        {sessions.length > 0 ? (
          <SessionGanttChart sessions={sessions} />
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Bugün hiç oturum kaydı bulunamadı.
          </div>
        )}
      </FocusHubContent>
    </EfficiencyModal>
  );
};

// 2. Learning Load Card
export const LearningLoadCard = () => {
  const { loading, loadWeek, loadDay, loadMonth, loadAll } = useEfficiencyData();

  if (loading) return <GlassCard className="h-full"><LoadingState /></GlassCard>;

  return (
    <EfficiencyModal
      title="Odaklanma Trendi"
      trigger={
        <div className="h-full w-full">
          <GlassCard className="h-full flex flex-col p-6">
            <CardHeader 
              icon={BookOpen}
              iconColor="text-sky-400"
              iconBg="bg-sky-500/10"
              title="Odaklanma Trendi"
              subtitle="Son 7 günlük çalışma aktivitesi"
              action={<Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />}
            />
            <div className="flex-1 w-full min-h-0 mt-4">
              <LearningLoadChart data={loadWeek} />
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
      />
    </EfficiencyModal>
  );
};

// 3. Practice Center Card
export const PracticeCenterCard = () => {
  const { loading, bloomStats } = useEfficiencyData();
  const totalSolved = bloomStats.reduce((acc, curr) => acc + curr.questionsSolved, 0);

  if (loading) return <GlassCard className="h-full"><LoadingState /></GlassCard>;

  return (
    <EfficiencyModal
      title="Pratik Merkezi İstatistikleri"
      trigger={
        <div className="h-full w-full">
          <GlassCard className="h-full flex flex-col p-6">
            <CardHeader 
              icon={Zap}
              iconColor="text-amber-400"
              iconBg="bg-amber-500/10"
              title="Pratik Merkezi"
              subtitle="Soru çözümü ve seviye analizi"
              action={<Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />}
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
export const MasteryNavigatorCard = () => {
  const { loading, lessonMastery } = useEfficiencyData();

  if (loading) return <GlassCard className="h-full"><LoadingState /></GlassCard>;

  return (
    <EfficiencyModal
      title="Ders Ustalığı ve İlerleme"
      trigger={
        <div className="h-full w-full">
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
              action={<Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />}
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
export const ConsistencyHeatmapCard = () => {
  const { loading, consistencyData } = useEfficiencyData();

  if (loading) return <GlassCard className="h-full"><LoadingState /></GlassCard>;

  return (
    <GlassCard className="p-6 flex flex-col h-full">
      <CardHeader 
        icon={Calendar}
        iconColor="text-emerald-400"
        iconBg="bg-emerald-500/10"
        title="Tutarlılık Analizi"
        subtitle="Son 35 günlük çalışma disiplini"
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
export const RecentActivitiesContainer = () => {
  const { loading, recentSessions } = useEfficiencyData();

  if (loading) return <GlassCard className="h-full"><LoadingState /></GlassCard>;

  return (
    <div className="h-full w-full">
      <RecentActivitiesCard sessions={recentSessions} />
    </div>
  );
};
