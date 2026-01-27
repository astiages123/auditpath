"use client";

import { useState } from "react";
import { TrendingUp, Video, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { EfficiencyData, CumulativeStats, SubjectCompetency } from "@/shared/lib/core/client-db";
import { StatDetailModal } from "./StatDetailModal";
import { HistoryView } from "./HistoryView";
import { GeneralProgress } from "./GeneralProgress";
import { SubjectRadar } from "./SubjectRadar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { motion } from "framer-motion";

interface EfficiencyCardProps {
    data: EfficiencyData;
    cumulativeData: CumulativeStats | null;
    userId: string;
    subjectData?: SubjectCompetency[];
}

export function EfficiencyCard({ data, cumulativeData, userId, subjectData }: EfficiencyCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const score = Math.round(data.efficiencyScore || 0);
    const ratio = data.ratio || 0;

    // Advanced Feedback Logic
    const getEfficiencyFeedback = () => {
        if (ratio === 0) return "Henüz veri yok";
        if (ratio < 1.0) return "Hızlı İzleme: Not alımını artırabilirsin";
        if (ratio >= 1.0 && ratio <= 1.2) return "Verimli: Dengeli çalışma temposu";
        if (ratio > 1.2 && ratio <= 1.7) return "Altın Oran: Mükemmel odak ve derinlik";
        if (ratio > 1.7 && ratio <= 2.2) return "Yoğun Çalışma: Biraz hızlanabilirsin";
        return "Yavaş İlerleme: Detaylara çok takıldın";
    };

    const getScoreColor = (s: number) => {
        if (s < 40) return "text-red-500";
        if (s < 70) return "text-amber-500";
        if (s < 90) return "text-emerald-500";
        return "text-indigo-500";
    };

    const getScoreBg = (s: number) => {
        if (s < 40) return "bg-red-500";
        if (s < 70) return "bg-amber-500";
        if (s < 90) return "bg-emerald-500";
        return "bg-indigo-500";
    };

    const scoreColor = getScoreColor(score);
    const scoreBg = getScoreBg(score);
    const feedback = getEfficiencyFeedback();

    return (
        <>
            <div
                onClick={() => setIsModalOpen(true)}
                className="group flex flex-col h-full relative"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-card border border-border/40 shadow-sm transition-colors ${scoreColor}`}>
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground tracking-tight leading-none mb-1">
                                Verimlilik
                            </h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                                Günlük Analiz
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Score & Feedback */}
                <div className="flex-1 flex flex-col justify-center py-4">
                    <div className="flex items-baseline gap-2">
                        <span className={`text-6xl font-black tracking-tighter ${scoreColor}`}>
                            {score}
                        </span>
                        <span className="text-sm font-bold text-muted-foreground uppercase opacity-40">Puan</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-foreground leading-tight max-w-[90%]">
                        {feedback}
                    </p>
                </div>

                {/* Status Items */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Video</span>
                        <span className="text-sm font-black text-foreground">{data.videoMinutes}dk</span>
                    </div>
                    <div className="h-6 w-px bg-border/40" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Çalışma</span>
                        <span className="text-sm font-black text-foreground">{data.pomodoroMinutes}dk</span>
                    </div>
                </div>

                {/* Score Axis/Bar Map */}
                <div className="relative pt-6 mt-auto">
                    <div className="flex justify-between text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 px-1 opacity-60">
                        <span>Düşük</span>
                        <span>İdeal</span>
                        <span>Sınır</span>
                    </div>
                    
                    <div className="h-3 w-full bg-muted/20 rounded-full overflow-hidden flex relative border border-border/10 p-px">
                        {/* Track Segments */}
                        <div className="h-full w-[40%] bg-red-500/70 border-r border-white/5" />
                        <div className="h-full w-[30%] bg-amber-500/70 border-r border-white/5" />
                        <div className="h-full w-[20%] bg-emerald-500/70 border-r border-white/5" />
                        <div className="h-full w-[10%] bg-indigo-500/70" />

                        {/* Animated Score Bar */}
                        <motion.div 
                            className={`absolute top-0 bottom-0 w-2 ${scoreBg} shadow-[0_0_15px_rgba(0,0,0,0.3)] z-10 rounded-full`}
                            initial={{ left: 0 }}
                            animate={{ left: `${Math.min(100, score)}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                        />
                    </div>
                </div>

                {/* Bottom Stats & Bonus */}
                <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-center gap-4 py-2 px-4 rounded-2xl bg-card/30 border border-border/20 backdrop-blur-sm">
                        <div className="flex flex-col items-center border-r border-border/40 pr-4">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Video</span>
                            <span className="text-xs font-black text-foreground">{data.videoMinutes}dk</span>
                        </div>
                        <div className="flex flex-col items-center pl-4">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Çalışma</span>
                            <span className="text-xs font-black text-foreground">{data.pomodoroMinutes}dk</span>
                        </div>
                    </div>

                    {data.quizMinutes > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-center gap-2 text-[10px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 py-2 rounded-xl"
                        >
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="uppercase tracking-widest">+{data.quizMinutes} DK QUIZ BONUSU</span>
                        </motion.div>
                    )}
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
                            {/* Score Explanation Box */}
                            <div className="bg-card/40 border border-border/50 p-6 rounded-3xl backdrop-blur-md">
                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    {/* Big Score */}
                                    <div className="flex-1 text-center md:text-left">
                                        <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                            <span className={`h-2 w-2 rounded-full ${scoreColor.replace('text-', 'bg-')}`} />
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Günün Puanı</span>
                                        </div>
                                        <h4 className={`text-7xl font-black tracking-tighter ${scoreColor}`}>
                                            {Math.round(data.efficiencyScore || 0)}
                                        </h4>
                                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                                            {feedback}. {ratio > 1.7 ? "Notlarını daha özete indirgeyerek hız kazanabilirsin." : ratio < 1.0 ? "Konuyu tam pekiştirmek için önemli yerleri not almayı unutma." : "Harika bir denge yakaladın, bu tempoyu koru!"}
                                        </p>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-1 gap-3 w-full md:w-64">
                                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-border/10">
                                            <div className="flex items-center gap-2">
                                                <Video className="h-4 w-4 text-purple-500" />
                                                <span className="text-xs font-semibold">Video</span>
                                            </div>
                                            <span className="font-mono font-bold">{data.videoMinutes}dk</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-border/10">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-blue-500" />
                                                <span className="text-xs font-semibold">Çalışma</span>
                                            </div>
                                            <span className="font-mono font-bold">{data.pomodoroMinutes}dk</span>
                                        </div>
                                        
                                        {data.quizMinutes > 0 && (
                                            <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    <span className="text-xs font-bold text-green-700">Quiz (Düşüldü)</span>
                                                </div>
                                                <span className="font-mono font-bold text-green-700">{data.quizMinutes}dk</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                             {/* Info Alert */}
                             <div className="bg-muted/30 p-4 rounded-xl flex items-start gap-3 text-xs text-muted-foreground leading-relaxed">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <p>
                                    Verimlilik puanı, izlediğiniz video süresi ile harcadığınız eforu kıyaslar. 
                                    <strong> Not:</strong> Sadece quiz çözdüğünüz aktif pratik seansları (video izlenmeyen oturumlar) bu hesaplamadan otomatik olarak çıkarılır, puanınızı düşürmez.
                                </p>
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
