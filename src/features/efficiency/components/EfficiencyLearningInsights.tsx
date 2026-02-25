import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { BookOpen, Maximize2, Activity, Target } from 'lucide-react';
import { GlassCard } from '@/shared/components/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyModal } from './EfficiencyModal';
import { LearningLoadAnalysis as LearningLoadContent } from './LearningLoadAnalysis';
import { MasteryProgressNavigator as MasteryNavigatorContent } from './MasteryProgressNavigator';
import { CardHeader } from './CardElements';
import { EfficiencyHeatmap } from './EfficiencyHeatmap';
import { useEfficiencyTrends } from '../hooks/useEfficiencyTrends';
import { useDailyMetrics } from '../hooks/useDailyMetrics';
import { useMasteryChains } from '../hooks/useMasteryChains';

// --- Sub-components (formerly separate files) ---

export const LearningLoadChart = ({
  data,
  targetMinutes,
}: {
  data: { day: string; extraStudyMinutes: number }[];
  targetMinutes?: number;
}) => {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
        barSize={32}
      >
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
            <stop offset="100%" stopColor="#0284c7" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="rgba(255,255,255,0.05)"
        />
        <XAxis
          dataKey="day"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis
          domain={[
            0,
            targetMinutes ? Math.max(targetMinutes + 20, 100) : 'auto',
          ]}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={70}
          tickFormatter={(val) => `${val}dk`}
        />
        <RechartsTooltip
          cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }}
          formatter={(value: number | undefined) =>
            value !== undefined ? [`${value} dk`, 'Çalışma'] : ['-', 'Çalışma']
          }
          contentStyle={{
            backgroundColor: '#1a1c1e',
            borderColor: 'rgba(255,255,255,0.1)',
            color: '#f8fafc',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
            padding: '12px',
          }}
          itemStyle={{ color: '#38bdf8', fontWeight: 600 }}
        />
        <Bar
          dataKey="extraStudyMinutes"
          name="Çalışma"
          fill="url(#barGradient)"
          radius={[6, 6, 6, 6]}
        />
        {targetMinutes && (
          <ReferenceLine
            y={targetMinutes}
            stroke="#10b981"
            strokeWidth={2.5}
            strokeDasharray="5 5"
            ifOverflow="extendDomain"
            label={{
              position: 'insideTopRight',
              value: `Hedef: ${targetMinutes} dk`,
              fill: '#10b981',
              fontSize: 11,
              fontWeight: 'bold',
              dy: -30,
              dx: -5,
            }}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
};

interface MasteryItem {
  lessonId: string;
  title: string;
  mastery: number;
  videoProgress: number;
  questionProgress: number;
}

const DEFAULT_DAILY_GOAL_MINUTES = 200;

// --- Learning Load Card ---

export const LearningLoadCard = () => {
  const { loading, loadWeek, loadDay, loadMonth, loadAll } =
    useEfficiencyTrends();
  const { dailyGoalMinutes } = useDailyMetrics();

  const dailyGoal = dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES;

  if (loading)
    return (
      <GlassCard className="h-full flex flex-col p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl bg-surface" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-surface" />
              <Skeleton className="h-3 w-48 bg-surface" />
            </div>
          </div>
        </div>
        <div className="flex-1 w-full min-h-0 mt-4 flex items-end gap-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-lg bg-surface"
              style={{ height: `${(((i + 1) * 117) % 60) + 20}%` }}
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
              iconColor="text-accent"
              iconBg="bg-accent/10"
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

// --- Mastery Ustalığı Card ---

export const MasteryNavigatorCard = () => {
  const { lessonMastery } = useMasteryChains();
  const loading = !lessonMastery || lessonMastery.length === 0;

  if (loading)
    return (
      <GlassCard className="h-full flex flex-col p-6">
        <Skeleton className="h-6 w-48 mb-6 bg-surface" />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl bg-surface" />
          ))}
        </div>
      </GlassCard>
    );

  // Sort by mastery score (DESC) and then by title (ASC), exclude 100%
  const displayNodes: MasteryItem[] = [...(lessonMastery || [])]
    .filter((item) => item.mastery < 100)
    .sort((a, b) => {
      if (b.mastery !== a.mastery) return b.mastery - a.mastery;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 4);

  return (
    <EfficiencyModal
      title="Akıllı Müfredat Ustalığı"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <GlassCard className="h-full flex flex-col p-6 overflow-hidden relative group">
            <CardHeader
              icon={Target}
              iconColor="text-accent"
              iconBg="bg-accent/10"
              title="Müfredat Ustalığı"
              subtitle="Ders bazlı ustalık seviyeleri"
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {displayNodes.map((node) => (
                <div
                  key={node.lessonId}
                  className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all flex flex-col justify-between gap-6 group/item"
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-bold text-white/70 line-clamp-2 leading-relaxed">
                        {node.title}
                      </span>
                      <span className="text-lg font-black text-accent ml-2">
                        %{node.mastery}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Mastery Main Bar */}
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-1000 ease-out"
                        style={{ width: `${node.mastery}%` }}
                      />
                    </div>

                    {/* 60/40 Weights Indicators */}
                    <div className="space-y-2 pt-1">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[11px] uppercase tracking-wider font-bold">
                          <span className="text-white/40">Video (%60)</span>
                          <span className="text-emerald-400">
                            %{node.videoProgress}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500/60"
                            style={{ width: `${node.videoProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[11px] uppercase tracking-wider font-bold">
                          <span className="text-white/40">Quiz (%40)</span>
                          <span className="text-primary">
                            %{node.questionProgress}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60"
                            style={{ width: `${node.questionProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      }
    >
      <MasteryNavigatorContent sessions={lessonMastery} />
    </EfficiencyModal>
  );
};

// --- Consistency Heatmap Card ---

export const ConsistencyHeatmapCard = () => {
  const { loading, consistencyData } = useEfficiencyTrends();

  if (loading)
    return (
      <GlassCard className="h-full flex flex-col p-6">
        <Skeleton className="h-6 w-48 mb-6 bg-surface" />
        <div className="flex-1 w-full flex items-center justify-center">
          <div className="grid grid-cols-7 gap-1.5">
            {[...Array(49)].map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-3.5 rounded-sm bg-surface" />
            ))}
          </div>
        </div>
      </GlassCard>
    );

  return (
    <GlassCard className="h-full flex flex-col p-6">
      <CardHeader
        icon={Activity}
        iconColor="text-accent"
        iconBg="bg-accent/10"
        title="Süreklilik Haritası"
        subtitle="Son 1 aylık çalışma yoğunluğu"
      />
      <div className="flex-1 w-full flex items-center justify-center min-h-0 mt-4">
        <EfficiencyHeatmap data={consistencyData} />
      </div>
    </GlassCard>
  );
};
