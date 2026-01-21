"use client";

import { motion } from "framer-motion";
import { TrendingUp, Clock, Video, BrainCircuit } from "lucide-react";
import type { CumulativeStats } from "@/lib/client-db";
import { BentoCard } from "@/components/statistics/BentoGrid";

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
    const getMeaning = (ratio: number) => {
        if (ratio < 1.0) return "Yüzeysel: Videoyu 1.5x hızda bitirip notlara neredeyse hiç bakmamışsın. Öğrenme kalıcılığı riskte.";
        if (ratio <= 1.7) return "Altın Oran: Teknolojiyi en verimli kullandığın aralık. Hızlı izleme + AI notlarını akıllıca sentezleme.";
        if (ratio <= 2.2) return "Yoğun Mesai: Konu ya çok zor ya da notları düzenlerken detaylarda boğulmaya başlıyorsun.";
        return "Verim Kaybı: AI desteğine rağmen bu süredeysen, öğrenmekten ziyade 'not süsleme' veya 'odak dağılması' yaşıyorsun.";
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-black text-foreground tracking-tight">Genel İlerleme</h2>
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
                                        <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                            <BrainCircuit className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Genel Katsayı</p>
                                            <p className={`text-2xl font-black ${
                                                data.ratio < 1.0 || data.ratio > 2.2 ? 'text-red-500' : 
                                                data.ratio >= 1.2 && data.ratio <= 1.7 ? 'text-green-500' :
                                                data.ratio >= 1.8 && data.ratio <= 2.2 ? 'text-yellow-500' :
                                                'text-foreground'
                                            }`}>
                                                {data.ratio > 0 ? `${data.ratio}x` : "-"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="h-1 w-full bg-muted/20 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full w-full opacity-60 ${
                                            data.ratio < 1.0 || data.ratio > 2.2 ? 'bg-red-500' : 
                                            data.ratio >= 1.2 && data.ratio <= 1.7 ? 'bg-green-500' :
                                            data.ratio >= 1.8 && data.ratio <= 2.2 ? 'bg-yellow-500' :
                                            'bg-foreground'
                                        }`} />
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[280px] bg-card/90 backdrop-blur-md border border-border/50 p-4 rounded-2xl shadow-2xl text-[11px] font-bold leading-relaxed">
                                {getMeaning(data.ratio)}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </div>
    );
}
