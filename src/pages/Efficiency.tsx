import { TrendingUp } from 'lucide-react';
import { useTransition } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { RecentQuizzesCard } from '@/features/efficiency/components';
import { CognitiveInsightsCard } from '@/features/efficiency/components';
import {
  FocusHubCard,
  LearningLoadCard,
  MasteryNavigatorCard,
  PracticeCenterCard,
  ConsistencyHeatmapCard,
  RecentActivitiesContainer,
} from '@/features/efficiency/components';
import { useEfficiency } from '@/features/efficiency/hooks';

const EfficiencyDashboard = () => {
  const efficiencyData = useEfficiency();

  return (
    <div className="space-y-6">
      {/* Row 1: Focus Hub + Learning Load */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="min-h-[320px]">
          <FocusHubCard data={efficiencyData} />
        </div>
        <div className="min-h-[320px]">
          <LearningLoadCard data={efficiencyData} />
        </div>
      </div>

      {/* Row 2: Practice Center + Mastery Navigator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="min-h-[280px]">
          <PracticeCenterCard data={efficiencyData} />
        </div>
        <div className="min-h-[280px]">
          <MasteryNavigatorCard data={efficiencyData} />
        </div>
      </div>

      {/* Row 3: Recent Quizzes + Consistency Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="min-h-[350px]">
          <RecentQuizzesCard recentQuizzes={efficiencyData.recentQuizzes} />
        </div>
        <div className="min-h-[350px]">
          <ConsistencyHeatmapCard data={efficiencyData} />
        </div>
      </div>

      {/* Row 4: Cognitive Insights + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="min-h-[250px]">
          <CognitiveInsightsCard
            loading={efficiencyData.loading}
            cognitiveAnalysis={
              efficiencyData.cognitiveAnalysis
                ? {
                    ...efficiencyData.cognitiveAnalysis,
                    recentInsights:
                      efficiencyData.cognitiveAnalysis.recentInsights?.filter(
                        (i): i is string => i !== null
                      ),
                    criticalTopics:
                      efficiencyData.cognitiveAnalysis.criticalTopics?.map(
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
          <RecentActivitiesContainer data={efficiencyData} />
        </div>
      </div>
    </div>
  );
};

const EfficiencyPage = () => {
  const [isPending] = useTransition();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground pb-20 m-5">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page Header Wrapper */}
          <div className="flex items-center gap-5 mb-8">
            <div className="relative group">
              <div className="absolute -inset-1 bg-linear-to-r rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative p-4 rounded-xl bg-card border border-border/50 leading-none flex items-center">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div>
              <h1
                className="text-3xl md:text-4xl font-black text-foreground tracking-tight"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Performans Analizi
              </h1>
              <p className="text-muted-foreground text-sm font-medium">
                Öğrenme yolculuğunuzun detaylı grafikleri ve gelişim metrikleri.
              </p>
            </div>
          </div>

          {/* Central Dashboard Engine */}
          <div
            style={{
              opacity: isPending ? 0.85 : 1,
              transition: 'opacity 200ms ease-in-out',
            }}
          >
            <EfficiencyDashboard />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default EfficiencyPage;
