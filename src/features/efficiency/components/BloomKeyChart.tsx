import {
  RadialBarChart,
  RadialBar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BloomStats } from '@/features/quiz/types';

// --- Bloom Key Chart (Polar Bar) ---
export const BloomKeyChart = ({ data }: { data: BloomStats[] }) => {
  // We want to transform data to have specific colors for each level
  // Order: Hatırla (Red) -> Anla (Orange) -> Uygula (Yellow) -> Analiz (Green) -> Değerlendir (Blue) -> Yarat (Violet)

  const formattedData = data.map((d) => {
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
