"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { FocusTrend } from "@/lib/client-db";
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

    return (
        <div className="h-full flex flex-col">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">30 Günlük Odaklanma Trendi</h3>
            <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis 
                            dataKey="date" 
                            tickFormatter={(val) => {
                                const d = new Date(val);
                                return `${d.getDate()}/${d.getMonth()+1}`;
                            }}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                        />
                         <YAxis 
                             hide 
                             padding={{ top: 20 }}
                         />
                        <Tooltip
                             contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                borderColor: 'hsl(var(--border))', 
                                borderRadius: '0.5rem',
                                color: 'hsl(var(--foreground))'
                            }}
                            labelFormatter={(val) => new Date(val).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long' })}
                            formatter={(val: number | string | undefined) => [`${val} dk`, 'Çalışma']}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="minutes" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorMinutes)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
