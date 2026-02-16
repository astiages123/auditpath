import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface AnalyticsChartProps {
  dailyData: { date: string; cost: number; fullDate?: string }[];
  isMounted: boolean;
  formatCurrency: (value: number) => string;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  dailyData,
  isMounted,
  formatCurrency,
}) => {
  return (
    <Card className="bg-card/30 border-border shadow-2xl overflow-hidden">
      <CardHeader className="border-b border-border/40 bg-card/20 py-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-heading font-bold text-white">
            Günlük Harcama Geçmişi (TRY)
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div
          className="w-full overflow-hidden"
          style={{
            height: 350,
            minHeight: 350,
            width: '100%',
            position: 'relative',
          }}
        >
          {isMounted && dailyData.length > 0 && (
            <ResponsiveContainer
              key="analytics-chart"
              width="100%"
              height={350}
            >
              <AreaChart
                data={dailyData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--primary)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="oklch(0.3715 0 0 / 0.3)"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  tickFormatter={(value) => `₺${value}`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  dx={-5}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px -10px oklch(0 0 0 / 0.5)',
                    padding: '12px',
                  }}
                  itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                  labelStyle={{
                    color: 'white',
                    marginBottom: '4px',
                    fontWeight: 'bold',
                  }}
                  formatter={(value: number | undefined) => [
                    formatCurrency(value || 0),
                    'Harcama',
                  ]}
                  labelFormatter={(label, payload) =>
                    payload[0]?.payload?.fullDate || label
                  }
                  cursor={{
                    stroke: 'var(--primary)',
                    strokeWidth: 1,
                    strokeDasharray: '4 4',
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCost)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
