"use client";

import type { SRSStats } from "@/shared/lib/core/client-db";
import { BookOpen } from "lucide-react";

interface SRSDistributionProps {
    data: SRSStats;
}

export function SRSDistribution({ data }: SRSDistributionProps) {
    const total = data.new + data.learning + data.review + data.mastered;
    
    // Fallback if no data
    if (total === 0) {
       return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                <BookOpen className="w-8 h-8 mb-2 opacity-50" />
                <p>Henüz not sistemi aktif değil</p>
            </div>
        );
    }
    
    const items = [
        { label: "Yeni", count: data.new, color: "bg-blue-500", desc: "Henüz başlanmadı" },
        { label: "Öğreniliyor", count: data.learning, color: "bg-yellow-500", desc: "Tekrar ediliyor" },
        { label: "Gözden Geçir", count: data.review, color: "bg-orange-500", desc: "Hatırlatma zamanı" },
        { label: "Tamamlandı", count: data.mastered, color: "bg-green-500", desc: "Kalıcı hafızada" },
    ];

    return (
        <div className="h-full flex flex-col">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">Hafıza Durumu (SRS)</h3>
            <div className="grid grid-cols-2 gap-3 flex-1">
                {items.map((item) => (
                    <div key={item.label} className="flex flex-col p-3 rounded-xl bg-muted/20 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${item.color}`} />
                            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">{item.count}</span>
                        <span className="text-[10px] text-muted-foreground/60 truncate">{item.desc}</span>
                    </div>
                ))}
            </div>
            
             <div className="mt-4 h-2 w-full bg-muted/30 rounded-full overflow-hidden flex">
                {items.map(item => {
                    const pct = (item.count / total) * 100;
                    if (pct === 0) return null;
                    return (
                        <div 
                            key={item.label} 
                            style={{ width: `${pct}%` }} 
                            className={`h-full ${item.color.replace('bg-', 'bg-')}`} 
                            title={`${item.label}: %${Math.round(pct)}`}
                        />
                    );
                })}
            </div>
        </div>
    );
}
