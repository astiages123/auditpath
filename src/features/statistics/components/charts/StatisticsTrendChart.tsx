import { useState, useEffect } from 'react';
import { cn } from '@/utils/stringHelpers';
import { formatDisplayDate } from '@/utils/dateUtils';
import { EFFICIENCY_THRESHOLDS } from '@/features/statistics/utils/constants';

import type {
  EfficiencyTrend,
  EfficiencyTrendProps,
} from '@/features/statistics/types/statisticsTypes';

type RechartsModule = typeof import('recharts');

/**
 * Renders the Efficiency Trend diverging bar chart, mapping items against standard multiplier thresholds.
 */
export const StatisticsTrendChart = ({ data }: EfficiencyTrendProps) => {
  const [Recharts, setRecharts] = useState<RechartsModule | null>(null);

  useEffect(() => {
    import('recharts').then((mod) => setRecharts(mod));
  }, []);

  // Deviation from 1.00 (Center of Ideal Range)
  const chartData = data.map((item: EfficiencyTrend) => ({
    ...item,
    deviation: item.score - 1.0,
  }));

  if (!Recharts) {
    return (
      <div className="w-full h-[400px] mt-4 animate-pulse bg-muted/20 rounded-xl" />
    );
  }

  const {
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
  } = Recharts;

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

          {/* Background Zones - shifted by -1.00 */}
          <ReferenceArea
            y1={EFFICIENCY_THRESHOLDS.SPEED - 1.0}
            y2={2.0}
            fill="oklch(63.68% 0.2078 25.3313)"
            fillOpacity={0.12}
          />
          <ReferenceArea
            y1={EFFICIENCY_THRESHOLDS.OPTIMAL_MAX - 1.0}
            y2={EFFICIENCY_THRESHOLDS.SPEED - 1.0}
            fill="oklch(77.596% 0.14766 79.996)"
            fillOpacity={0.12}
          />
          <ReferenceArea
            y1={EFFICIENCY_THRESHOLDS.DEEP - 1.0}
            y2={EFFICIENCY_THRESHOLDS.OPTIMAL_MAX - 1.0}
            fill="oklch(85.54% 0.1969 158.6115)"
            fillOpacity={0.12}
          />
          <ReferenceArea
            y1={EFFICIENCY_THRESHOLDS.STUCK - 1.0}
            y2={EFFICIENCY_THRESHOLDS.DEEP - 1.0}
            fill="oklch(77.596% 0.14766 79.996)"
            fillOpacity={0.12}
          />
          <ReferenceArea
            y1={-1.0}
            y2={EFFICIENCY_THRESHOLDS.STUCK - 1.0}
            fill="oklch(63.68% 0.2078 25.3313)"
            fillOpacity={0.12}
          />

          {/* Center Line: 1.00x */}
          <ReferenceLine
            y={0}
            stroke="oklch(85.54% 0.1969 158.6115)"
            strokeWidth={2}
            strokeDasharray="4 4"
            label={{
              position: 'right',
              value: 'Normal Merkezi',
              fill: 'oklch(85.54% 0.1969 158.6115)',
              fontSize: 10,
              fontWeight: 'bold',
            }}
          />

          {/* Axes */}
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10, dy: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val: string) => {
              return formatDisplayDate(val);
            }}
          />

          <YAxis
            dataKey="deviation"
            domain={[-1.0, 2.0]}
            ticks={[
              -1.0,
              EFFICIENCY_THRESHOLDS.STUCK - 1.0,
              EFFICIENCY_THRESHOLDS.DEEP - 1.0,
              0,
              EFFICIENCY_THRESHOLDS.OPTIMAL_MAX - 1.0,
              EFFICIENCY_THRESHOLDS.SPEED - 1.0,
              2.0,
            ]}
            interval={0}
            allowDecimals={true}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(val: number) => {
              if (val === 0) return '0';
              return val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
            }}
          />

          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const dPayload = payload[0].payload as EfficiencyTrend;
                const dScore = dPayload.score;

                const getStatusInfo = (val: number) => {
                  if (
                    val < EFFICIENCY_THRESHOLDS.STUCK ||
                    val >= EFFICIENCY_THRESHOLDS.SPEED
                  )
                    return { label: 'Kritik', color: 'text-destructive' };
                  if (
                    val >= EFFICIENCY_THRESHOLDS.DEEP &&
                    val <= EFFICIENCY_THRESHOLDS.OPTIMAL_MAX
                  )
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

          <Bar dataKey="deviation" barSize={32} radius={[4, 4, 4, 4]}>
            {chartData.map((entry: EfficiencyTrend, index: number) => {
              const val = entry.score;
              let color = 'oklch(77.596% 0.14766 79.996)'; // Default accent

              if (
                val >= EFFICIENCY_THRESHOLDS.DEEP &&
                val <= EFFICIENCY_THRESHOLDS.OPTIMAL_MAX
              ) {
                color = 'oklch(85.54% 0.1969 158.6115)'; // primary
              } else if (
                (val >= EFFICIENCY_THRESHOLDS.STUCK &&
                  val < EFFICIENCY_THRESHOLDS.DEEP) ||
                (val > EFFICIENCY_THRESHOLDS.OPTIMAL_MAX &&
                  val < EFFICIENCY_THRESHOLDS.SPEED)
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
