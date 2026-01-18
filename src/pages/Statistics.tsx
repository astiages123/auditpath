
import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
    getDailyStats,
    getLast30DaysActivity,
    getEfficiencyRatio,
    getRecentSessions,
    getQuizStats,
    getSubjectCompetency,
    getBloomStats,
    getSRSStats,
    getFocusTrend,
    type DailyStats,
    type DayActivity,
    type EfficiencyData,
    type TimelineBlock,
    type QuizStats,
    type SubjectCompetency,
    type BloomStats,
    type SRSStats,
    type FocusTrend
} from "@/lib/client-db";
import { BentoGrid, BentoCard } from "@/components/statistics/BentoGrid";
import { DailyGoalCard } from "@/components/statistics/DailyGoalCard";
import { ConsistencyHeatmap } from "@/components/statistics/ConsistencyHeatmap";
import { EfficiencyCard } from "@/components/statistics/EfficiencyCard";
import { TimelineGantt } from "@/components/statistics/TimelineGantt";
import { LearningOverview } from "@/components/statistics/LearningOverview";
import { SubjectRadar } from "@/components/statistics/SubjectRadar";
import { BloomAnalysis } from "@/components/statistics/BloomAnalysis";
import { SRSDistribution } from "@/components/statistics/SRSDistribution";
import { FocusTrend as FocusTrendChart } from "@/components/statistics/FocusTrend";
import { Loader2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function StatisticsPage() {
    const { user, loading: authLoading } = useAuth();
    const userId = user?.id;
    const isLoaded = !authLoading;
    const [loading, setLoading] = useState(true);

    // State for stats
    const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
    const [heatmapData, setHeatmapData] = useState<DayActivity[]>([]);
    const [efficiencyData, setEfficiencyData] = useState<EfficiencyData | null>(null);
    const [timelineData, setTimelineData] = useState<TimelineBlock[]>([]);
    
    // New Stats
    const [quizStats, setQuizStats] = useState<QuizStats | null>(null);
    const [subjectStats, setSubjectStats] = useState<SubjectCompetency[]>([]);
    const [bloomStats, setBloomStats] = useState<BloomStats[]>([]);
    const [srsStats, setSrsStats] = useState<SRSStats | null>(null);
    const [focusTrend, setFocusTrend] = useState<FocusTrend[]>([]);

    useEffect(() => {
        document.title = "İstatistikler | AuditPath";
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute("content", "Günlük çalışma istatistiklerinizi ve verimliliğinizi takip edin.");
        }

        if (!isLoaded) return;
        if (!userId) {
            setLoading(false);
            return;
        }

        async function fetchData() {
            try {
                const [
                    stats, 
                    heatmap, 
                    efficiency, 
                    timeline,
                    quiz,
                    subjects,
                    bloom,
                    srs,
                    trend
                ] = await Promise.all([
                    getDailyStats(userId!),
                    getLast30DaysActivity(userId!),
                    getEfficiencyRatio(userId!),
                    getRecentSessions(userId!, 50),
                    getQuizStats(userId!),
                    getSubjectCompetency(userId!),
                    getBloomStats(userId!),
                    getSRSStats(userId!),
                    getFocusTrend(userId!),
                ]);

                setDailyStats(stats);
                setHeatmapData(heatmap);
                setEfficiencyData(efficiency);
                setTimelineData(timeline);
                setQuizStats(quiz);
                setSubjectStats(subjects);
                setBloomStats(bloom);
                setSrsStats(srs);
                setFocusTrend(trend);
            } catch (error) {
                console.error("Failed to fetch statistics:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [isLoaded, userId]);

    if (!isLoaded || loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!userId) {
        return <div className="p-8 text-center text-muted-foreground">Lütfen giriş yapın.</div>;
    }

    const hasData = dailyStats !== null;

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
            {/* Page Header */}
            <div className="mb-12">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                            <TrendingUp className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1
                                className="text-2xl md:text-3xl font-bold text-foreground"
                                style={{ fontFamily: "var(--font-heading)" }}
                            >
                                Performans Analizi
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                Öğrenme yolculuğunuzun detaylı grafikleri ve verimlilik metrikleri.
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats Summary */}
                    {dailyStats && (
                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card border border-border">
                            <div className="p-2 rounded-lg bg-orange-500/10">
                                <span className="text-orange-500 font-bold block leading-none">⚡</span>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-foreground">
                                    {Math.round(dailyStats.totalWorkMinutes / 60)}s {dailyStats.totalWorkMinutes % 60}d
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Bugünkü Çalışma
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {!hasData && !loading ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-[3rem] border border-border/40 bg-card/30 p-20 text-center backdrop-blur-sm"
                >
                    <div className="max-w-md mx-auto">
                        <h2 className="text-2xl font-semibold mb-4 text-foreground">Veri Bulunamadı</h2>
                        <p className="text-muted-foreground mb-8 text-lg">
                            İstatistikleriniz henüz oluşturulmamış. Çalışmaya başlayarak ilk verilerinizi toplayın!
                        </p>
                    </div>
                </motion.div>
            ) : (
                <BentoGrid>
                    {/* Row 1: Daily Goals, Learning Overview, Efficiency */}
                    <BentoCard className="bg-linear-to-br from-primary/5 to-transparent">
                        {dailyStats ? <DailyGoalCard data={dailyStats} /> : "Yükleniyor..."}
                    </BentoCard>

                    <BentoCard className="bg-linear-to-bl from-green-500/5 to-transparent">
                        {quizStats ? <LearningOverview data={quizStats} /> : "Yükleniyor..."}
                    </BentoCard>

                    <BentoCard isAlarm={efficiencyData?.isAlarm} className="bg-linear-to-br from-accent/5 to-transparent">
                        {efficiencyData ? <EfficiencyCard data={efficiencyData} /> : "Veri yok"}
                    </BentoCard>

                    {/* Row 2: Radar, Focus Trend */}
                    <BentoCard className="">
                         <SubjectRadar data={subjectStats} />
                    </BentoCard>

                    <BentoCard colSpan={2} className="bg-linear-to-r from-blue-500/5 to-purple-500/5">
                        <FocusTrendChart data={focusTrend} />
                    </BentoCard>

                    {/* Row 3: SRS, Bloom, Heatmap */}
                    <BentoCard>
                        {srsStats ? <SRSDistribution data={srsStats} /> : "Yükleniyor..."}
                    </BentoCard>

                    <BentoCard>
                        <BloomAnalysis data={bloomStats} />
                    </BentoCard>

                    <BentoCard className="bg-linear-to-br from-primary/5 to-transparent">
                        <ConsistencyHeatmap data={heatmapData} />
                    </BentoCard>

                    {/* Row 4: Timeline */}
                    <BentoCard colSpan={3} className="min-h-[400px]">
                        <div className="h-full overflow-hidden">
                            <TimelineGantt data={timelineData} />
                        </div>
                    </BentoCard>
                </BentoGrid>
            )}
        </div>
    );
}
