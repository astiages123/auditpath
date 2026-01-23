"use client";

import { useState } from "react";
import { AlertTriangle, TrendingUp, Video, Clock } from "lucide-react";
import type { EfficiencyData, CumulativeStats, SubjectCompetency } from "@/lib/client-db";
import { StatDetailModal } from "./StatDetailModal";
import { HistoryView } from "./HistoryView";
import { GeneralProgress } from "./GeneralProgress";
import { SubjectRadar } from "./SubjectRadar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EfficiencyCardProps {
    data: EfficiencyData;
    cumulativeData: CumulativeStats | null;
    userId: string;
    subjectData?: SubjectCompetency[];
}

export function EfficiencyCard({ data, cumulativeData, userId, subjectData }: EfficiencyCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const maxValue = Math.max(data.videoMinutes, data.pomodoroMinutes, 1);
    const videoPercentage = (data.videoMinutes / maxValue) * 100;
    const pomodoroPercentage = (data.pomodoroMinutes / maxValue) * 100;

    // Helper for color coding
    const getRatioColor = (r: number) => {
        if (r < 1.0) return "text-red-500";
        if (r >= 1.2 && r <= 1.7) return "text-green-500";
        if (r >= 1.8 && r <= 2.2) return "text-yellow-500";
        if (r > 2.2) return "text-red-500";
        return "text-muted-foreground"; // 1.0 - 1.2 gap -> fallback or consider "low"
    };

    const getRatioBg = (r: number) => {
        if (r < 1.0) return "bg-red-500/10";
        if (r >= 1.2 && r <= 1.7) return "bg-green-500/10";
        if (r >= 1.8 && r <= 2.2) return "bg-yellow-500/10";
        if (r > 2.2) return "bg-red-500/10";
        return "bg-muted/10";
    };

    const ratioColor = getRatioColor(data.ratio);
    const ratioBg = getRatioBg(data.ratio);

    const activeColor = data.isAlarm ? "text-destructive" : ratioColor;
    const activeBg = data.isAlarm ? "bg-destructive/10" : ratioBg;
    const activeFill = data.isAlarm ? "bg-destructive" : (
        ratioColor.includes("green") ? "bg-green-500" :
        ratioColor.includes("yellow") ? "bg-yellow-500" :
        ratioColor.includes("red") ? "bg-red-500" : "bg-primary"
    );

    return (
        <>
            <div
                onClick={() => setIsModalOpen(true)}
                className="group flex flex-col h-full"
            >
                {/* Title and Icon */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className={`h-6 w-6 ${activeColor}`} />
                        <h3 className="text-lg font-semibold text-muted-foreground">
                            Aktif Çalışma Endeksi
                        </h3>
                    </div>
                    {data.isAlarm && (
                        <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
                    )}
                </div>

                {/* Main Ratio Display */}
                <div className="flex-1 flex flex-col justify-center items-center py-2">
                    <div className={`text-6xl font-black tracking-tighter transition-colors ${activeColor}`}>
                        {data.ratio > 0 ? `${data.ratio}x` : "-"}
                    </div>
                    <p className="text-[12px] font-bold text-foreground uppercase tracking-[0.2em] mt-2">
                        Öğrenme Katsayısı
                    </p>
                </div>

                {/* Compact Progress Bars */}
                <div className="space-y-3 mt-4">
                    <div className="space-y-1">
                        <div className="flex justify-between text-[12px] font-black uppercase tracking-widest">
                            <span className="text-foreground">Video</span>
                            <span className="text-foreground">{data.videoMinutes}dk</span>
                        </div>
                        <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent/60 transition-all duration-700"
                                style={{ width: `${videoPercentage}%` }}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[12px] font-black uppercase tracking-widest">
                            <span className="text-foreground">Pomodoro</span>
                            <span className="text-foreground">{data.pomodoroMinutes}dk</span>
                        </div>
                        <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-700 ${activeFill}`}
                                style={{ width: `${pomodoroPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <StatDetailModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                title="Verimlilik Detayları"
            >
                <div className="space-y-6">
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-muted/20 p-1 rounded-2xl h-12">
                            <TabsTrigger value="details" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Detaylar</TabsTrigger>
                            <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Geçmiş</TabsTrigger>
                            <TabsTrigger value="cumulative" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Genel</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {/* Stats Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="group bg-card/40 border border-border/50 p-6 rounded-3xl hover:border-accent/40 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-xl bg-accent/10 text-accent">
                                            <Video className="h-5 w-5" />
                                        </div>
                                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Video Süresi</p>
                                    </div>
                                    <p className="text-4xl font-black text-foreground mb-1">{data.videoMinutes} <span className="text-lg font-medium text-muted-foreground">dakika</span></p>
                                    <p className="text-xs text-muted-foreground/70 leading-relaxed font-medium">
                                        Bugün tamamlanan videoların toplam süresi.
                                    </p>
                                </div>

                                <div className="group bg-card/40 border border-border/50 p-6 rounded-3xl hover:border-primary/40 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                            <Clock className="h-5 w-5" />
                                        </div>
                                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Pomodoro Süresi</p>
                                    </div>
                                    <p className="text-4xl font-black text-foreground mb-1">{data.pomodoroMinutes} <span className="text-lg font-medium text-muted-foreground">dakika</span></p>
                                    <p className="text-xs text-muted-foreground/70 leading-relaxed font-medium">
                                        Bugün aktif çalışarak geçirilen süre.
                                    </p>
                                </div>
                            </div>

                            {/* Ratio Visualizer */}
                            <div className={`relative overflow-hidden p-8 rounded-[32px] border border-border/50 backdrop-blur-md ${ratioBg} transition-all duration-500`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-2 w-2 rounded-full bg-foreground/20 animate-pulse" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Sizin Oranınız</p>
                                        </div>
                                        <h4 className={`text-6xl font-black tracking-tighter ${ratioColor}`}>
                                            {data.ratio > 0 ? `${data.ratio}x` : "-"}
                                        </h4>
                                        <p className="mt-4 text-sm font-semibold leading-relaxed text-foreground/80 max-w-md">
                                            {data.ratio > 0 ? (
                                                data.ratio < 1.0 ? "Yüzeysel: Videoyu hızlı bitirip notlara bakmamışsın. Öğrenme kalıcılığı riskte." :
                                                data.ratio <= 1.7 ? (data.ratio >= 1.2 ? "Altın Oran: Teknolojiyi en verimli kullandığın aralık. Akıllı sentez." : "Düşük Verilik: Henüz ideal verimlilikte değilsin.") :
                                                data.ratio <= 2.2 ? "Yoğun Mesai: Konu zor olabilir veya detaylarda boğuluyor olabilirsin." :
                                                "Verim Kaybı: 'Not süsleme' veya 'odak dağılması' yaşıyor olabilirsin."
                                            ) : "Henüz yeterli veri girişi yapılmadı."}
                                        </p>
                                    </div>

                                    {/* Visual Scale Bar */}
                                    <div className="w-full md:w-64 space-y-4">
                                        <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                            <span>Düşük</span>
                                            <span>İdeal</span>
                                            <span>Limit</span>
                                        </div>
                                        <div className="relative h-4 w-full bg-background/40 rounded-full border border-border/30 overflow-hidden flex shadow-inner">
                                            <div className="h-full bg-red-500/40 w-1/4 border-r border-white/5" />
                                            <div className="h-full bg-green-500/60 w-1/4 border-r border-white/5" />
                                            <div className="h-full bg-yellow-500/40 w-1/4 border-r border-white/5" />
                                            <div className="h-full bg-red-500/40 w-1/4" />
                                            
                                            {/* Indicator */}
                                            {data.ratio > 0 && (
                                                <div 
                                                    className="absolute top-0 bottom-0 w-1 bg-foreground shadow-[0_0_10px_white] z-10 transition-all duration-1000 ease-out"
                                                    style={{ 
                                                        left: `${Math.min(Math.max((data.ratio / 3) * 100, 2), 98)}%` 
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <div className="flex justify-between gap-1">
                                            <span className="h-1 flex-1 bg-red-500/20 rounded-full" />
                                            <span className="h-1 flex-1 bg-green-500/50 rounded-full" />
                                            <span className="h-1 flex-1 bg-yellow-500/20 rounded-full" />
                                            <span className="h-1 flex-1 bg-red-500/20 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="history" className="mt-4">
                             <HistoryView userId={userId} />
                        </TabsContent>

                        <TabsContent value="cumulative" className="mt-4 space-y-6">
                            {cumulativeData ? (
                                <GeneralProgress data={cumulativeData} />
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
                            )}
                            
                            {subjectData && subjectData.length > 0 && (
                                <div className="pt-4 border-t border-border/50">
                                    <h4 className="text-sm font-semibold mb-3">Konu Dağılımı</h4>
                                     <div className="h-[300px] w-full">
                                        <SubjectRadar data={subjectData} />
                                     </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </StatDetailModal>
        </>
    );
}
