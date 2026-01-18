"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import type { BloomStats } from "@/lib/client-db";
import { Layers } from "lucide-react";

interface BloomAnalysisProps {
    data: BloomStats[];
}

const BLOOM_TRANSLATIONS: Record<string, string> = {
    "Knowledge": "Bilgi",
    "Application": "Uygulama",
    "Analysis": "Analiz"
};

export function BloomAnalysis({ data }: BloomAnalysisProps) {
    if (!data || data.every(d => d.total === 0)) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                <Layers className="w-8 h-8 mb-2 opacity-50 text-primary" />
                <p className="font-medium">Bilişsel analiz için veri yok</p>
                <p className="text-xs opacity-70">Çözdüğünüz sorular seviyenizi belirler.</p>
            </div>
        );
    }

    const translatedData = data.map(d => ({
        ...d,
        displayLevel: BLOOM_TRANSLATIONS[d.level] || d.level
    }));

    return (
        <div className="h-full flex flex-col group">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold bg-linear-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Bilişsel Seviye
                </h3>
                <Layers className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors duration-500" />
            </div>

            <div className="flex-1 min-h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={translatedData} 
                        layout="vertical" 
                        margin={{ left: 30, right: 30 }}
                        barGap={10}
                    >
                         <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.4 0 0/0.1)" />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis 
                            dataKey="displayLevel" 
                            type="category" 
                            width={80} 
                            tick={{ fill: 'oklch(0.9 0 0)', fontSize: 13, fontWeight: 600 }} 
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={false}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-card border-2 border-border/80 p-3 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-300">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{d.displayLevel}</p>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].color }} />
                                                <p className="text-lg font-black text-foreground">%{d.score}</p>
                                            </div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{d.correct} / {d.total} Doğru</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar 
                            dataKey="score" 
                            radius={[0, 10, 10, 0]} 
                            barSize={24}
                            animationDuration={1500}
                        >
                            {translatedData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.score > 70 ? "oklch(0.7 0.15 140)" : entry.score > 40 ? "oklch(0.7 0.15 80)" : "oklch(0.6 0.18 20)"} 
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="flex items-center justify-center gap-3 mt-4">
                {["Bilgi", "Uygulama", "Analiz"].map((step, i) => (
                    <div key={step} className="flex items-center gap-1.5 opacity-60">
                        <span className="text-[10px] font-black">{step}</span>
                        {i < 2 && <span className="text-[8px] text-primary">→</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}
