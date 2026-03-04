import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RecentQuizzesCard,
  CognitiveInsightsCard,
  FocusHubCard,
  LearningLoadCard,
  ConsistencyHeatmapCard,
  PracticeCenterCard,
  RecentActivitiesContainer,
} from '@/features/efficiency/components';
import { ScoreTypeProgress } from '@/features/analytics/components/layout/ScoreTypeProgress';
import { useCognitiveInsights } from '@/features/efficiency/hooks/useCognitiveInsights';
import { useEfficiencyTrends } from '@/features/efficiency/hooks/useEfficiencyTrends';
import { useDailyMetrics } from '@/features/efficiency/hooks/useDailyMetrics';
import { useMasteryChains } from '@/features/efficiency/hooks/useMasteryChains';

const DashboardSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="h-[350px] p-6 skeleton-shimmer bg-surface/5 border-border/10">
          <Skeleton className="w-16 h-16 rounded-xl bg-surface/20 mb-6" />
          <Skeleton className="w-[60%] h-8 bg-surface/20 mb-4" />
          <Skeleton className="w-full h-40 bg-surface/20 rounded-lg" />
        </Card>
        <Card className="h-[350px] p-6 skeleton-shimmer bg-surface/5 border-border/10">
          <Skeleton className="w-16 h-16 rounded-xl bg-surface/20 mb-6" />
          <Skeleton className="w-[60%] h-8 bg-surface/20 mb-4" />
          <Skeleton className="w-full h-40 bg-surface/20 rounded-lg" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="h-[300px] p-6 skeleton-shimmer bg-surface/5 border-border/10">
          <Skeleton className="w-16 h-16 rounded-xl bg-surface/20 mb-6" />
          <div className="flex justify-center">
            <Skeleton className="w-48 h-48 rounded-full bg-surface/20" />
          </div>
        </Card>
        <Card className="h-[300px] p-6 skeleton-shimmer bg-surface/5 border-border/10">
          <Skeleton className="w-16 h-16 rounded-xl bg-surface/20 mb-6" />
          <Skeleton className="w-full h-12 bg-surface/20 rounded-lg mb-3" />
          <Skeleton className="w-full h-12 bg-surface/20 rounded-lg mb-3" />
          <Skeleton className="w-full h-12 bg-surface/20 rounded-lg" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="h-[350px] p-6 skeleton-shimmer bg-surface/5 border-border/10">
          <Skeleton className="w-16 h-16 rounded-xl bg-surface/20 mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="w-full h-16 bg-surface/20 rounded-lg"
              />
            ))}
          </div>
        </Card>
        <Card className="h-[350px] p-6 skeleton-shimmer bg-surface/5 border-border/10">
          <Skeleton className="w-16 h-16 rounded-xl bg-surface/20 mb-6" />
          <Skeleton className="w-full h-[200px] bg-surface/20 rounded-lg" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="h-[400px] p-6 skeleton-shimmer bg-surface/5 border-border/10">
          <Skeleton className="w-16 h-16 rounded-xl bg-surface/20 mb-6" />
          <Skeleton className="w-full h-[250px] bg-surface/20 rounded-lg" />
        </Card>
        <Card className="h-[400px] p-6 skeleton-shimmer bg-surface/5 border-border/10">
          <Skeleton className="w-16 h-16 rounded-xl bg-surface/20 mb-6" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton
                key={i}
                className="w-full h-12 bg-surface/20 rounded-lg"
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const EfficiencyDashboard = () => {
  const dailyMetrics = useDailyMetrics();
  const efficiencyTrends = useEfficiencyTrends();
  const {
    loadingCognitive,
    loadingBloom,
    loadingQuizzes,
    loadingSessions,
    cognitiveAnalysis,
    bloomStats,
    recentQuizzes,
    recentSessions,
  } = useCognitiveInsights();

  const { lessonMastery } = useMasteryChains();

  const isDataLoading =
    dailyMetrics.loading ||
    efficiencyTrends.loading ||
    loadingCognitive ||
    loadingBloom ||
    loadingQuizzes ||
    loadingSessions;

  if (isDataLoading) {
    return <DashboardSkeleton />;
  }

  // lessonMastery'yi ScoreTypeProgress'in beklediği format
  const masteries = lessonMastery.map((m) => ({
    courseId: m.lessonId,
    courseName: m.title,
    courseType: m.type,
    videoProgress: m.videoProgress,
    questionProgress: m.questionProgress,
    masteryScore: m.mastery,
  }));

  return (
    <div className="space-y-6">
      {/* Row 1: Focus Hub + Learning Load */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <FocusHubCard
            dailyMetrics={dailyMetrics}
            efficiencyTrend={efficiencyTrends.efficiencyTrend}
          />
        </div>
        <div>
          <LearningLoadCard
            loadWeek={efficiencyTrends.loadWeek}
            loadDay={efficiencyTrends.loadDay}
            loadMonth={efficiencyTrends.loadMonth}
            loadAll={efficiencyTrends.loadAll}
            dailyGoalMinutes={dailyMetrics.dailyGoalMinutes}
          />
        </div>
      </div>

      {/* Row 2: Practice Center + Score Type Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <PracticeCenterCard bloomStats={bloomStats} />
        </div>
        <div>
          <ScoreTypeProgress masteries={masteries} />
        </div>
      </div>

      {/* Row 3: Recent Quizzes + Consistency Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <RecentQuizzesCard recentQuizzes={recentQuizzes} />
        </div>
        <div>
          <ConsistencyHeatmapCard
            consistencyData={efficiencyTrends.consistencyData}
          />
        </div>
      </div>

      {/* Row 4: Cognitive Insights + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <CognitiveInsightsCard
            loading={false}
            cognitiveAnalysis={
              cognitiveAnalysis
                ? {
                    ...cognitiveAnalysis,
                    recentInsights: cognitiveAnalysis.recentInsights?.filter(
                      (i): i is string => i !== null
                    ),
                    criticalTopics: cognitiveAnalysis.criticalTopics?.map(
                      (t: {
                        id: string;
                        fails: number;
                        diagnosis?: string | null;
                      }) => ({
                        ...t,
                        diagnosis: t.diagnosis || undefined,
                      })
                    ),
                  }
                : null
            }
          />
        </div>
        <div>
          <RecentActivitiesContainer
            recentSessions={recentSessions}
            focusPowerWeek={efficiencyTrends.focusPowerWeek}
            focusPowerMonth={efficiencyTrends.focusPowerMonth}
            focusPowerAll={efficiencyTrends.focusPowerAll}
          />
        </div>
      </div>
    </div>
  );
};

const EfficiencyPage = () => {
  return (
    <ErrorBoundary>
      <div className="bg-background text-foreground">
        <PageHeader
          title="İstatistikler"
          subtitle="Çalışma performansını ve bilişsel yükünü analiz et."
        />
        <EfficiencyDashboard />
      </div>
    </ErrorBoundary>
  );
};

export default EfficiencyPage;
