"use client";

import { TrendingUp, Clock, Video, BrainCircuit } from "lucide-react";
import type { CumulativeStats } from "@/lib/client-db";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface GeneralProgressProps {
    data: CumulativeStats;
}

export function GeneralProgress({ data }: GeneralProgressProps) {
    const calculateScore = (r: number) => {
        if (r <= 0) return 0;
        let score = 0;
        if (r < 0.5) score = 30 + (r * 40);
        else if (r < 1.0) score = 50 + ((r - 0.5) * 60);
        else if (r <= 1.5) score = 80 + ((r - 1.0) * 40);
        else if (r <= 2.0) score = 100 - ((r - 1.5) * 40);
        else score = Math.max(20, 80 - ((r - 2.0) * 20));
        return Math.round(score);
    };

    const score = calculateScore(data.ratio);

    const getScoreColor = (s: number) => {
        if (s < 40) return "text-red-500";
        if (s < 70) return "text-amber-500";
        if (s < 90) return "text-emerald-500";
        return "text-indigo-500";
    };

    const getScoreLabel = (ratio: number) => {
        if (ratio < 1.0) return "Hızlı İzleme: Not alımı düşük";
        if (ratio >= 1.0 && ratio <= 1.2) return "Verimli: Dengeli tempo";
        if (ratio > 1.2 && ratio <= 1.7) return "Mükemmel: İdeal öğrenme";
        if (ratio > 1.7 && ratio <= 2.2) return "Yoğun Çalışma: Biraz hızlanabilirsin";
        return "Yavaş İlerleme: Detaylara takıldın";
    };

    const scoreColor = getScoreColor(score);
    const feedback = getScoreLabel(data.ratio);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-black text-foreground tracking-tight">Genel İlerleme Analizi</h2>
                </div>
                <div className="h-px flex-1 bg-border/30 mx-6 hidden md:block" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="group relative overflow-hidden p-6 rounded-[32px] bg-card/30 backdrop-blur-xl border border-border/50 hover:border-blue-500/40 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] -z-10 group-hover:bg-blue-500/10 transition-colors" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Toplam Çalışma</p>
                            <p className="text-2xl font-black text-foreground">
                                {Math.round(data.totalWorkMinutes)} <span className="text-xs font-bold text-muted-foreground uppercase">dk</span>
                            </p>
                        </div>
                    </div>
                    <div className="h-1 w-full bg-muted/20 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full w-full opacity-60" />
                    </div>
                </div>

                <div className="group relative overflow-hidden p-6 rounded-[32px] bg-card/30 backdrop-blur-xl border border-border/50 hover:border-orange-500/40 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[50px] -z-10 group-hover:bg-orange-500/10 transition-colors" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                            <Video className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Toplam Video</p>
                            <p className="text-2xl font-black text-foreground">
                                {Math.round(data.totalVideoMinutes)} <span className="text-xs font-bold text-muted-foreground uppercase">dk</span>
                            </p>
                        </div>
                    </div>
                    <div className="h-1 w-full bg-muted/20 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full w-full opacity-60" />
                    </div>
                </div>

                <div className="group relative overflow-hidden p-6 rounded-[32px] bg-card/30 backdrop-blur-xl border border-border/50 hover:border-purple-500/40 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[50px] -z-10 group-hover:bg-purple-500/10 transition-colors" />
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="cursor-help">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-sm">
                                            <BrainCircuit className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Genel Skor</p>
                                            <p className={`text-2xl font-black leading-none ${scoreColor}`}>
                                                {score > 0 ? score : "-"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden flex p-px">
                                        <div className={`h-full rounded-full transition-all duration-1000 ${scoreColor.replace('text-', 'bg-')}`} 
                                             style={{ width: `${score}%` }} />
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[280px] bg-popover/95 backdrop-blur-xl border border-border p-4 rounded-2xl shadow-2xl text-[11px] font-bold leading-relaxed text-popover-foreground">
                                <div className="space-y-1">
                                    <p className="text-foreground">{feedback}</p>
                                    <p className="text-muted-foreground font-normal">Tüm zamanların video/etüt dengesi gözetilerek hesaplanmıştır.</p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </div>
    );
}
