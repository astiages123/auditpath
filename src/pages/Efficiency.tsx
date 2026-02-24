import { ErrorBoundary } from '@/components/ui/error-boundary';
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
import { useCognitiveInsights } from '@/features/efficiency/hooks/useCognitiveInsights';

const EfficiencyDashboard = () => {
  const { loading, cognitiveAnalysis } = useCognitiveInsights();

  return (
    <div className="space-y-6">
      {/* Row 1: Focus Hub + Learning Load */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="min-h-[320px]">
          <FocusHubCard />
        </div>
        <div className="min-h-[320px]">
          <LearningLoadCard />
        </div>
      </div>

      {/* Row 2: Practice Center + Mastery Navigator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="min-h-[280px]">
          <PracticeCenterCard />
        </div>
        <div className="min-h-[280px]">
          <MasteryNavigatorCard />
        </div>
      </div>

      {/* Row 3: Recent Quizzes + Consistency Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="min-h-[350px]">
          <RecentQuizzesCard />
        </div>
        <div className="min-h-[350px]">
          <ConsistencyHeatmapCard />
        </div>
      </div>

      {/* Row 4: Cognitive Insights + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="min-h-[250px]">
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
        <div className="min-h-[400px]">
          <RecentActivitiesContainer />
        </div>
      </div>
    </div>
  );
};

const EfficiencyPage = () => {
  return (
    <ErrorBoundary>
      <div className="bg-background text-foreground pb-20">
        {/* Central Dashboard Engine */}
        <div>
          <EfficiencyDashboard />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default EfficiencyPage;
