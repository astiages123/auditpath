import { useState, useEffect } from 'react';
import type { BloomStats } from '@/features/quiz/types';

type RechartsModule = typeof import('recharts');

// ==========================================
// === PROPS ===
// ==========================================

export interface BloomKeyChartProps {
  data: BloomStats[];
}

export interface FormattedChartData {
  name: string;
  score: number;
  fill: string;
}

// ==========================================
// === COMPONENT ===
// ==========================================

/**
 * Renders a radial bar chart displaying the user's Bloom taxonomy statistics.
 * Dynamically loads Recharts to avoid SSR/bundling issues.
 */
export const BloomKeyChart = ({ data }: BloomKeyChartProps) => {
  // ==========================================
  // === HOOKS & STATE ===
  // ==========================================
  const [Recharts, setRecharts] = useState<RechartsModule | null>(null);

  useEffect(() => {
    import('recharts').then((mod) => setRecharts(mod));
  }, []);

  // ==========================================
  // === DERIVED STATE ===
  // ==========================================
  const formattedData: FormattedChartData[] = data.map((d) => {
    let fill = 'oklch(82.968% 0.0001 271.152)'; // muted-foreground
    switch (d.level) {
      case 'Bilgi':
        fill = 'oklch(63.68% 0.2078 25.3313)'; // destructive
        break;
      case 'Uygula':
        fill = 'oklch(77.596% 0.14766 79.996)'; // accent
        break;
      case 'Analiz':
        fill = 'oklch(85.54% 0.1969 158.6115)'; // primary
        break;
    }
    return {
      name: d.level,
      score: d.score || 0,
      fill: fill,
    };
  });

  // ==========================================
  // === RENDER ===
  // ==========================================
  if (!Recharts) {
    return (
      <div className="w-full h-[300px] animate-pulse bg-muted/20 rounded-xl" />
    );
  }

  const { RadialBarChart, RadialBar, Legend, Tooltip, ResponsiveContainer } =
    Recharts;

  return (
    <ResponsiveContainer width="100%" height={300} minHeight={0}>
      <RadialBarChart
        cx="50%"
        cy="45%"
        innerRadius="30%"
        outerRadius="100%"
        barSize={45}
        data={formattedData}
        startAngle={180}
        endAngle={-180}
      >
        <RadialBar
          background={{ fill: 'rgba(255,255,255,0.05)' }}
          dataKey="score"
          cornerRadius={6}
          label={{
            position: 'insideStart',
            fill: 'oklch(92.19% 0 0deg)',
            fontSize: '10px',
            fontWeight: 'bold',
            stroke: 'oklch(20% 0 0deg / 0.4)',
            strokeWidth: 2,
            paintOrder: 'stroke',
          }}
        />
        <Legend
          iconSize={12}
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{
            paddingTop: '20px',
            width: '100%',
          }}
        />
        <Tooltip
          labelFormatter={() => ''}
          formatter={(
            value: number | string | undefined,
            _name?: string,
            props?: { payload?: { name?: string } }
          ) => [`%${value}`, props?.payload?.name || 'Başarı']}
          contentStyle={{
            backgroundColor: 'oklch(26.86% 0 0deg)',
            borderColor: 'rgba(255,255,255,0.1)',
            color: 'oklch(92.19% 0 0deg)',
            borderRadius: '8px',
            fontSize: '12px',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
          }}
          itemStyle={{ color: 'oklch(92.19% 0 0deg)', fontWeight: 600 }}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
};
