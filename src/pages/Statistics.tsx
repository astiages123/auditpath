import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PageHeader } from '@/shared/components/PageHeader';
import {
  RecentQuizzesCard,
  CognitiveInsightsCard,
  FocusHubCard,
  LearningLoadCard,
  ConsistencyHeatmapCard,
  PracticeCenterCard,
  RecentActivitiesContainer,
} from '@/features/efficiency/components';
import { ScoreTypeProgress } from '@/features/analytics/components/ScoreTypeProgress';
import { useCognitiveInsights } from '@/features/efficiency/hooks/useCognitiveInsights';
import { useMasteryChains } from '@/features/efficiency/hooks/useMasteryChains';

const EfficiencyDashboard = () => {
  const { loadingCognitive, cognitiveAnalysis } = useCognitiveInsights();
  const { lessonMastery } = useMasteryChains();

  // lessonMastery'yi ScoreTypeProgress'in beklediği CourseMastery formatına dönüştür
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
          <FocusHubCard />
        </div>
        <div>
          <LearningLoadCard />
        </div>
      </div>

      {/* Row 2: Practice Center + Score Type Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <PracticeCenterCard />
        </div>
        <div>
          <ScoreTypeProgress masteries={masteries} />
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
            loading={loadingCognitive}
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
