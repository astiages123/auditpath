import {
  RadialBarChart,
  RadialBar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BloomStats } from '../../types';

// --- Bloom Key Chart (Polar Bar) ---
export const BloomKeyChart = ({ data }: { data: BloomStats[] }) => {
  // We want to transform data to have specific colors for each level
  // Order: Hatırla (Red) -> Anla (Orange) -> Uygula (Yellow) -> Analiz (Green) -> Değerlendir (Blue) -> Yarat (Violet)

  const formattedData = data.map((d) => {
    let fill = '#64748b';
    switch (d.level) {
      case 'Bilgi':
        fill = '#e11d48';
        break; // Rose-500
      case 'Uygula':
        fill = '#f59e0b';
        break; // Amber-500
      case 'Analiz':
        fill = '#10b981';
        break; // Emerald-500
    }
    return {
      name: d.level,
      score: d.score || 0, // Ensure value
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
            fill: '#fff',
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
            backgroundColor: '#1a1c1e',
            borderColor: 'rgba(255,255,255,0.1)',
            color: '#f8fafc',
            borderRadius: '8px',
            fontSize: '12px',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
          }}
          itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
};
