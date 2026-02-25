import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Cell,
} from 'recharts';
import { cn } from '@/utils/stringHelpers';
import { EfficiencyTrend } from '@/features/efficiency/types/efficiencyTypes';
import { formatDisplayDate } from '@/utils/dateUtils';

// --- Efficiency Trend Chart ---
export interface EfficiencyTrendProps {
  data: EfficiencyTrend[];
}

export const EfficiencyTrendChart = ({ data }: EfficiencyTrendProps) => {
  // 1. Veri Hazırlığı (Diverging Logic)
  // Deviation from 1.30 (Golden Ratio)
  const chartData = data.map((item: EfficiencyTrend) => ({
    ...item,
    deviation: item.score - 1.3,
  }));

  return (
    <div className="w-full h-[400px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
            opacity={0.5}
          />

          {/* 2. Zemin Bölgeleri (Background Zones) */}
          {/* Maps to ranges shifted by -1.30 */}

          {/* Critical High: > 2.20 (Deviation > 0.90) */}
          <ReferenceArea
            y1={0.9}
            y2={2.7}
            fill="oklch(63.68% 0.2078 25.3313)"
            fillOpacity={0.12}
          />

          {/* Warning High: 1.60 - 2.20 (Deviation 0.30 - 0.90) */}
          <ReferenceArea
            y1={0.3}
            y2={0.9}
            fill="oklch(77.596% 0.14766 79.996)"
            fillOpacity={0.12}
          />

          {/* Optimal: 1.00 - 1.60 (Deviation -0.30 - 0.30) */}
          <ReferenceArea
            y1={-0.3}
            y2={0.3}
            fill="oklch(85.54% 0.1969 158.6115)"
            fillOpacity={0.12}
          />

          {/* Warning Low: 0.65 - 1.00 (Deviation -0.65 - -0.30) */}
          <ReferenceArea
            y1={-0.65}
            y2={-0.3}
            fill="oklch(77.596% 0.14766 79.996)"
            fillOpacity={0.12}
          />

          {/* Critical Low: < 0.65 (Deviation < -0.65) */}
          <ReferenceArea
            y1={-1.3}
            y2={-0.65}
            fill="oklch(63.68% 0.2078 25.3313)"
            fillOpacity={0.12}
          />

          {/* Merkez Hattı: Sıfır Hata / Tam Akış (1.30x) */}
          <ReferenceLine
            y={0}
            stroke="oklch(85.54% 0.1969 158.6115)"
            strokeWidth={2}
            strokeDasharray="4 4"
            label={{
              position: 'right',
              value: 'İdeal',
              fill: 'oklch(85.54% 0.1969 158.6115)',
              fontSize: 10,
              fontWeight: 'bold',
            }}
          />

          {/* 2. Eksen Yapılandırması */}
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10, dy: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => {
              return formatDisplayDate(val);
            }}
          />

          <YAxis
            dataKey="deviation"
            domain={[-1.3, 2.7]}
            ticks={[-1.3, -0.65, -0.3, 0, 0.3, 0.9, 1.7, 2.7]} // Significant markers
            interval={0}
            allowDecimals={true}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(val) => {
              // Display the absolute score equivalent instead of deviation for UX?
              // Or keep deviation? User asked "XAxis... score... YAxis... dates" previously,
              // now "YAxis (Dikey): domain={[-1.3, 2.7]}".
              // I will simply show the Deviation value or maybe empty to avoid confusion if areas are colored.
              // But usually users want to see scale.
              // Let's show signed deviation as requested.
              if (val === 0) return '0';
              return val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
            }}
          />

          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const dPayload = payload[0].payload;
                const dScore = dPayload.score;

                const getStatusInfo = (val: number) => {
                  if (val < 0.65 || val > 2.2)
                    return { label: 'Kritik', color: 'text-destructive' };
                  if (val >= 1.0 && val <= 1.6)
                    return { label: 'İdeal', color: 'text-primary' };
                  return { label: 'Ayarlama', color: 'text-accent' };
                };

                const status = getStatusInfo(dScore);

                return (
                  <div className="bg-card border border-border-subtle text-foreground rounded-xl shadow-xl p-3 text-xs space-y-2 min-w-[200px] z-50">
                    <p className="font-bold border-b border-border-subtle pb-2 text-center text-foreground">
                      {label
                        ? formatDisplayDate(label as string | number, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : ''}
                    </p>
                    <div className="flex flex-col gap-1.5 py-1">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-muted-foreground">
                          Verim Katsayısı
                        </span>
                        <span
                          className={cn(
                            'font-mono font-bold text-lg',
                            status.color
                          )}
                        >
                          {dScore.toFixed(2)}x
                        </span>
                      </div>
                      <div
                        className={cn(
                          'text-[12px] font-bold text-center px-2 py-2 rounded-lg bg-surface',
                          status.color
                        )}
                      >
                        {status.label}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-white/5 space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground/70">
                          Çalışma Süresi
                        </span>
                        <span className="text-foreground font-medium">
                          {dPayload.workMinutes} dk
                        </span>
                      </div>
                      {dPayload.videoMinutes > 0 && (
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-muted-foreground/70">
                            Video İçeriği
                          </span>
                          <span className="text-foreground font-medium">
                            {dPayload.videoMinutes} dk
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          {/* 3. Bar Renkleri: Skor bazlı */}
          <Bar
            dataKey="deviation"
            barSize={32} // Slightly wider bars for better visibility
            radius={[4, 4, 4, 4]}
          >
            {chartData.map((entry, index) => {
              const val = entry.score;
              let color = 'oklch(77.596% 0.14766 79.996)'; // Default accent

              if (val >= 1.0 && val <= 1.6) {
                color = 'oklch(85.54% 0.1969 158.6115)'; // primary
              } else if (
                (val >= 0.65 && val < 1.0) ||
                (val > 1.6 && val <= 2.2)
              ) {
                color = 'oklch(77.596% 0.14766 79.996)'; // accent
              } else {
                color = 'oklch(63.68% 0.2078 25.3313)'; // destructive
              }

              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
