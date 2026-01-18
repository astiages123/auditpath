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
        <div className="h-full flex flex-col group">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold bg-linear-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Konu Yetkinliği
                </h3>
                <Target className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors duration-500" />
            </div>

            <div className="flex-1 min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                        <PolarGrid stroke="oklch(0.4 0 0 / 0.3)" />
                        <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fill: 'oklch(0.9 0 0)', fontSize: 11, fontWeight: 600 }} 
                        />
                        <Radar
                            name="Başarı"
                            dataKey="score"
                            stroke="oklch(0.85 0.2 160)"
                            fill="oklch(0.85 0.2 160)"
                            fillOpacity={0.4}
                            animationDuration={1500}
                        />
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-card border-2 border-border/80 p-3 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                                                {payload[0].payload.subject}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                                <span className="text-lg font-black text-foreground">%{payload[0].value}</span>
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
            
            <div className="mt-4 flex justify-center gap-6">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_oklch(0.85_0.2_160/0.5)]" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Performans</span>
                </div>
            </div>
        </div>
    );
}
