"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { FocusTrend } from "@/shared/lib/core/client-db";
import { Zap } from "lucide-react";

interface FocusTrendProps {
    data: FocusTrend[];
}

export function FocusTrend({ data }: FocusTrendProps) {
    if (!data || data.length < 2) {
         return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                <Zap className="w-8 h-8 mb-2 opacity-50" />
                <p>Trend analizi için daha fazla veriye ihtiyaç var (En az 2 gün)</p>
            </div>
        );
    }

    // Filter outliers (e.g., > 10 hours work in a single day displayed as minutes?)
    // If we have 11280 (188 hours), it's garbage. 
    // If we have 600 (10 hours), it's high but possible.
    // Let's cap visual at 720 mins (12 hours) to keep chart readable.
    const cleanData = data.map(d => ({
        ...d,
        minutes: d.minutes > 720 ? 720 : d.minutes
    }));

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Zap className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Odaklanma Trendi</h3>
                        <p className="text-[10px] text-muted-foreground">Son 30 günlük aktivite</p>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                    <AreaChart data={cleanData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                        <XAxis 
                            dataKey="date" 
                            tickFormatter={(val) => {
                                const d = new Date(val);
                                return `${d.getDate()}/${d.getMonth()+1}`;
                            }}
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                            dy={10}
                        />
                         <YAxis 
                             hide={false}
                             width={50}
                             tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                             axisLine={false}
                             tickLine={false}
                             tickFormatter={(val) => `${val}dk`}
                             domain={[0, 'auto']}
                         />
                        <Tooltip
                             contentStyle={{ 
                                backgroundColor: 'var(--card)', 
                                borderColor: 'var(--border)', 
                                borderRadius: '12px',
                                color: 'var(--foreground)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                            cursor={{ stroke: '#818cf8', strokeWidth: 1, strokeDasharray: '4 4' }}
                            labelFormatter={(val) => new Date(val).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}
                            itemStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                            formatter={(val: number | string | undefined) => [`${val} dk`, 'Odak Süresi']}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="minutes" 
                            stroke="#818cf8" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorMinutes)" 
                            activeDot={{ r: 6, strokeWidth: 4, stroke: 'var(--background)', fill: '#6366f1' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
