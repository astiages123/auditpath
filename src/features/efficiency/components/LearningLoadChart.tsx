import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { LearningLoad } from '../types/efficiencyTypes';

// --- Learning Load Stacked Bar Chart ---
export interface LearningLoadProps {
  data: LearningLoad[];
  targetMinutes?: number;
}

export const LearningLoadChart = ({
  data,
  targetMinutes,
}: LearningLoadProps) => {
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
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }}
          formatter={(value: number | string | undefined) => [
            `${value} dk`,
            'Çalışma',
          ]}
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
            stroke="#f59e0b"
            strokeWidth={2.5}
            strokeDasharray="5 5"
            ifOverflow="extendDomain"
            label={{
              position: 'insideTopRight',
              value: `Hedef: ${targetMinutes} dk`,
              fill: '#f59e0b',
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
