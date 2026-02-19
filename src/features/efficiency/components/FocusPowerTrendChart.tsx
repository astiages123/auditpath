import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FocusPowerPoint } from '../types/efficiencyTypes';

// --- New Component: Focus Power Trend Chart ---
export interface FocusPowerTrendProps {
  data: FocusPowerPoint[];
  rangeLabel: string; // "Hafta" | "Ay" | "Aylar"
}

export const FocusPowerTrendChart = ({ data }: FocusPowerTrendProps) => {
  // Determine gradient depending on trend?
  // Or just a beautiful emerald gradient since Focus Power is generally good.
  return (
    <div className="w-full h-full min-h-[300px] mt-4">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.05)"
          />
          <XAxis
            dataKey="date"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            dy={10}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 'auto']}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            cursor={{
              stroke: '#10b981',
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as FocusPowerPoint;
                return (
                  <div className="bg-[#1a1c1e] border border-white/10 rounded-xl p-3 shadow-2xl space-y-2 min-w-[160px]">
                    <div className="border-b border-white/5 pb-2 mb-2 font-bold text-center text-white/90 text-xs">
                      {label}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        Odak Gücü
                      </span>
                      <span className="text-lg font-bold text-white">
                        {d.score}
                      </span>
                    </div>
                    <div className="space-y-1 pt-1 opacity-80">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Odak</span>
                        <span className="text-white">{d.workMinutes} dk</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Mola</span>
                        <span className="text-white">{d.breakMinutes} dk</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">
                          Duraklatma
                        </span>
                        <span className="text-white">{d.pauseMinutes} dk</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#10b981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorFocus)"
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
