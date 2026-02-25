import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PageHeader } from '@/shared/components/PageHeader';
import {
  RecentQuizzesCard,
  CognitiveInsightsCard,
  FocusHubCard,
  LearningLoadCard,
  MasteryNavigatorCard,
  ConsistencyHeatmapCard,
  PracticeCenterCard,
  RecentActivitiesContainer,
} from '@/features/efficiency/components';
import { EfficiencyPageSkeleton } from '@/shared/components/SkeletonTemplates';
import { useCognitiveInsights } from '@/features/efficiency/hooks/useCognitiveInsights';

const EfficiencyDashboard = () => {
  const { loading, cognitiveAnalysis } = useCognitiveInsights();

  if (loading && !cognitiveAnalysis) {
    return <EfficiencyPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Focus Hub + Learning Load */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <FocusHubCard />
        </div>
        <div>
          <LearningLoadCard />
        </div>
      </div>

      {/* Row 2: Practice Center + Mastery Navigator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <PracticeCenterCard />
        </div>
        <div>
          <MasteryNavigatorCard />
        </div>
      </div>

      {/* Row 3: Recent Quizzes + Consistency Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <RecentQuizzesCard />
        </div>
        <div>
          <ConsistencyHeatmapCard />
        </div>
      </div>

      {/* Row 4: Cognitive Insights + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <CognitiveInsightsCard
            loading={loading}
            cognitiveAnalysis={
              cognitiveAnalysis
                ? {
                    ...cognitiveAnalysis,
                    recentInsights: cognitiveAnalysis.recentInsights?.filter(
                      (i): i is string => i !== null
                    ),
                    criticalTopics: cognitiveAnalysis.criticalTopics?.map(
                      (t) => ({
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
          <RecentActivitiesContainer />
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
