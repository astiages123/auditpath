import { useState, useEffect } from 'react';

type RechartsModule = typeof import('recharts');

export interface LearningLoadData {
  day: string;
  extraStudyMinutes: number;
  videoMinutes: number;
  readingMinutes?: number;
}

export interface LearningLoadChartProps {
  data: LearningLoadData[];
  targetMinutes?: number;
}

/**
 * Renders a stacked bar chart displaying the user's daily learning load
 * across different content types (focus, video, reading).
 */
export const LearningLoadChart = ({
  data,
  targetMinutes,
}: LearningLoadChartProps) => {
  const [Recharts, setRecharts] = useState<RechartsModule | null>(null);

  useEffect(() => {
    import('recharts').then((mod) => setRecharts(mod));
  }, []);

  if (!Recharts) {
    return (
      <div className="w-full h-[230px] animate-pulse bg-muted/20 rounded-xl" />
    );
  }

  const {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip: RechartsTooltip,
    ResponsiveContainer,
    ReferenceLine,
  } = Recharts;

  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
        barSize={32}
      >
        <defs>
          <linearGradient id="extraStudyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
            <stop offset="100%" stopColor="#0284c7" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="videoGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
            <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="readingGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
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
          tickFormatter={(val: number) => `${val}dk`}
        />
        <RechartsTooltip
          cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }}
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const total = payload.reduce(
                (sum, entry) => sum + ((entry.value as number) || 0),
                0
              );
              return (
                <div className="bg-[#1a1c1e] border border-white/10 rounded-xl shadow-2xl p-3 min-w-[140px]">
                  <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-tight">
                    {label}
                  </p>
                  <div className="space-y-1.5">
                    {payload.map((entry) => (
                      <div
                        key={entry.name}
                        className="flex justify-between items-center gap-4"
                      >
                        <span
                          className="text-[11px] font-medium"
                          style={{ color: entry.color }}
                        >
                          {entry.name}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-white">
                          {entry.value} dk
                        </span>
                      </div>
                    ))}
                    <div className="pt-1.5 mt-1.5 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[11px] font-bold text-white">
                        Toplam
                      </span>
                      <span className="text-[11px] font-mono font-bold text-emerald-400">
                        {total} dk
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="extraStudyMinutes"
          name="Odaklanma"
          stackId="a"
          fill="url(#extraStudyGradient)"
          radius={[0, 0, 4, 4]}
        />
        <Bar
          dataKey="videoMinutes"
          name="Video"
          stackId="a"
          fill="url(#videoGradient)"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="readingMinutes"
          name="Okuma"
          stackId="a"
          fill="url(#readingGradient)"
          radius={[4, 4, 0, 0]}
        />
        {targetMinutes && (
          <ReferenceLine
            y={targetMinutes}
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            ifOverflow="extendDomain"
            label={{
              position: 'insideTopRight',
              value: `Hedef: ${targetMinutes} dk`,
              fill: '#10b981',
              fontSize: 10,
              fontWeight: 'bold',
              dy: -25,
              dx: -5,
            }}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default LearningLoadChart;
