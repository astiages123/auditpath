"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { SubjectCompetency } from "@/lib/client-db";
import { Target } from "lucide-react";

interface SubjectRadarProps {
    data: SubjectCompetency[];
}

export function SubjectRadar({ data }: SubjectRadarProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                <Target className="w-8 h-8 mb-2 opacity-50 text-primary" />
                <p className="font-medium">Konu analizi için yeterli veri yok</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col group animate-in fade-in zoom-in-95 duration-700">
            <div className="flex items-center justify-between mb-8 px-2">
                <div>
                    <h3 className="text-xl font-black text-foreground tracking-tight">Konu Yetkinliği</h3>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Ders Bazlı Başarı Analizi</p>
                </div>
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-500">
                    <Target className="w-5 h-5" />
                </div>
            </div>

            <div className="flex-1 min-h-[300px] w-full relative">
                <div className="absolute inset-0 bg-primary/5 blur-[80px] rounded-full -z-10" />
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                        <PolarGrid stroke="oklch(0.4 0 0 / 0.15)" strokeWidth={1} />
                        <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fill: 'oklch(0.7 0 0)', fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' }} 
                        />
                        <Radar
                            name="Başarı"
                            dataKey="score"
                            stroke="var(--primary)"
                            strokeWidth={3}
                            fill="var(--primary)"
                            fillOpacity={0.15}
                        />
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-card/80 backdrop-blur-md border border-border/50 p-4 rounded-2xl shadow-2xl">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                                                {payload[0].payload.subject}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                                                <span className="text-2xl font-black text-foreground">%{payload[0].value}</span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="mt-8 flex justify-center">
                <div className="flex items-center gap-3 px-4 py-2 bg-muted/20 rounded-full border border-border/50">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Süreç Performansı</span>
                </div>
            </div>
        </div>
    );
}
