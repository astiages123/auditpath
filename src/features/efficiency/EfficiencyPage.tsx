import { TrendingUp } from "lucide-react";
import {
  FocusHubCard,
  LearningLoadCard,
  MasteryNavigatorCard,
  PracticeCenterCard,
  ConsistencyHeatmapCard,
  RecentActivitiesContainer,
  RecentQuizzesCard,
  CognitiveInsightsCard,
} from './components';

const EfficiencyPage = () => {
  return (
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
                    style={{ fontFamily: "var(--font-heading)" }}
                >
                    Performans Analizi
                </h1>
                <p className="text-muted-foreground text-sm font-medium">
                    Öğrenme yolculuğunuzun detaylı grafikleri ve gelişim metrikleri.
                </p>
            </div>
        </div>

        {/* Central Dashboard Engine */}
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
                    <CognitiveInsightsCard />
                </div>
                <div className="min-h-[400px]">
                    <RecentActivitiesContainer />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EfficiencyPage;
