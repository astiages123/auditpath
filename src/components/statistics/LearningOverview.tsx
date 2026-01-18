"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { QuizStats } from "@/lib/client-db";
import { Brain } from "lucide-react";

interface LearningOverviewProps {
    data: QuizStats;
}

export function LearningOverview({ data }: LearningOverviewProps) {
    if (data.totalAnswered === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                <Brain className="w-8 h-8 mb-2 opacity-50 text-primary" />
                <p className="font-medium">Henüz çözülen test yok</p>
                <p className="text-xs opacity-70">Quiz modülü ile kendinizi test edin!</p>
            </div>
        );
    }

    const chartData = [
        { name: "Doğru", value: data.correct, color: "oklch(0.7 0.15 140)" }, // Modern Green
        { name: "Yanlış", value: data.incorrect, color: "oklch(0.6 0.18 20)" }, // Modern Red
        { name: "Pas/Boş", value: data.blank, color: "oklch(0.5 0.05 250)" }, // Modern Slate/Blue
    ].filter(d => d.value > 0);

    return (
        <div className="h-full flex flex-col group">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold bg-linear-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Genel Başarı
                </h3>
                <Brain className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors duration-500" />
            </div>
            
            <div className="flex-1 flex items-center justify-center relative min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                            animationBegin={0}
                            animationDuration={1500}
                        >
                            {chartData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.color}
                                    style={{ filter: `drop-shadow(0 0 8px ${entry.color}44)` }} 
                                />
                            ))}
                        </Pie>
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-card border-2 border-border/80 p-2.5 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-300">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                                <span className="text-xs font-bold text-foreground">{d.name}</span>
                                            </div>
                                            <p className="text-lg font-black mt-1 text-foreground/90">
                                                {payload[0].value} <span className="text-[10px] font-normal text-muted-foreground uppercase tracking-wider">Soru</span>
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                
                {/* Center Text with enhanced styling */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="relative">
                        <span className="text-4xl font-black text-foreground drop-shadow-sm tracking-tighter">
                            %{data.successRate}
                        </span>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary/30 rounded-full" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-2">
                        Başarı
                    </span>
                </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border/10 flex items-end justify-between">
                <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Toplam Soru</p>
                    <p className="font-black text-2xl text-foreground/90">{data.totalAnswered}</p>
                </div>
                <div className="flex gap-1.5 pb-1">
                    {chartData.map((entry, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    ))}
                </div>
            </div>
        </div>
    );
}
