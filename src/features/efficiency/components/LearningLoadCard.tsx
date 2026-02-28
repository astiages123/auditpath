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
import { BookOpen, Maximize2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyModal } from './EfficiencyModal';
import { LearningLoadAnalysis as LearningLoadContent } from './LearningLoadAnalysis';
import { CardHeader } from './CardElements';
import { useEfficiencyTrends } from '../hooks/useEfficiencyTrends';
import { useDailyMetrics } from '../hooks/useDailyMetrics';
import { DAILY_GOAL_MINUTES as DEFAULT_DAILY_GOAL_MINUTES } from '../utils/constants';

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

export const LearningLoadCard = () => {
  const { loading, loadWeek, loadDay, loadMonth, loadAll } =
    useEfficiencyTrends();
  const { dailyGoalMinutes } = useDailyMetrics();

  const dailyGoal = dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES;

  if (loading)
    return (
      <Card className="h-full flex flex-col p-6">
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
      </Card>
    );

  return (
    <EfficiencyModal
      title="Odaklanma Trendi"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <Card className="h-full flex flex-col p-6">
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
          </Card>
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
