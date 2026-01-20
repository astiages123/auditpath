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
        <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Genel İlerleme
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Toplam Çalışma</p>
                        <p className="text-2xl font-bold">
                            {Math.round(data.totalWorkMinutes)} dk
                        </p>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-orange-500/10 text-orange-500">
                        <Video className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Toplam Video</p>
                        <p className="text-2xl font-bold">
                            {Math.round(data.totalVideoMinutes)} dk
                        </p>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
                        <BrainCircuit className="w-6 h-6" />
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="cursor-help">
                                    <p className="text-sm text-muted-foreground">Genel Katsayı</p>
                                    <p className={`text-2xl font-bold ${
                                        data.ratio < 1.0 || data.ratio > 2.2 ? 'text-red-500' : 
                                        data.ratio >= 1.2 && data.ratio <= 1.7 ? 'text-green-500' :
                                        data.ratio >= 1.8 && data.ratio <= 2.2 ? 'text-yellow-500' :
                                        'text-foreground'
                                    }`}>
                                        {data.ratio > 0 ? `${data.ratio}x` : "-"}
                                    </p>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[250px] text-xs p-3">
                                {getMeaning(data.ratio)}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </div>
    );
}
