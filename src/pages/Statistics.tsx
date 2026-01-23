
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
    getDailyStats,
    getLast30DaysActivity,
    getEfficiencyRatio,
    getQuizStats,
    getSubjectCompetency,
    getBloomStats,
    getSRSStats,
    getFocusTrend,
    getDailyEfficiencySummary,
    type DailyStats,
    type DayActivity,
    type EfficiencyData,
    type QuizStats,
    type SubjectCompetency,
    type BloomStats,
    type SRSStats,
    type FocusTrend,
    getCumulativeStats,
    type CumulativeStats,
    type DailyEfficiencySummary
} from "@/lib/client-db";
import { BentoGrid, BentoCard } from "@/components/statistics/BentoGrid";
import { DailyGoalCard } from "@/components/statistics/DailyGoalCard";
import { ConsistencyHeatmap } from "@/components/statistics/ConsistencyHeatmap";
import { EfficiencyCard } from "@/components/statistics/EfficiencyCard";
import { LearningOverview } from "@/components/statistics/LearningOverview";
import { SubjectRadar } from "@/components/statistics/SubjectRadar";
import { BloomAnalysis } from "@/components/statistics/BloomAnalysis";
import { SRSDistribution } from "@/components/statistics/SRSDistribution";
import { FocusTrend as FocusTrendChart } from "@/components/statistics/FocusTrend";
import { MasterEfficiencyCard } from "@/components/statistics/MasterEfficiencyCard";
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
    const [cumulativeStats, setCumulativeStats] = useState<CumulativeStats | null>(null);
    
    // New Stats
    const [quizStats, setQuizStats] = useState<QuizStats | null>(null);
    const [subjectStats, setSubjectStats] = useState<SubjectCompetency[]>([]);
    const [bloomStats, setBloomStats] = useState<BloomStats[]>([]);
    const [srsStats, setSrsStats] = useState<SRSStats | null>(null);
    const [focusTrend, setFocusTrend] = useState<FocusTrend[]>([]);
    const [efficiencySummary, setEfficiencySummary] = useState<DailyEfficiencySummary | null>(null);

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
                    quiz,
                    subjects,
                    bloom,
                    srs,
                    trend,
                    cumulativeData,
                    effSummary
                ] = await Promise.all([
                    getDailyStats(userId!),
                    getLast30DaysActivity(userId!),
                    getEfficiencyRatio(userId!),
                    getQuizStats(userId!),
                    getSubjectCompetency(userId!),
                    getBloomStats(userId!),
                    getSRSStats(userId!),
                    getFocusTrend(userId!),
                    getCumulativeStats(userId!),
                    getDailyEfficiencySummary(userId!),
                ]);

                setDailyStats(stats);
                setHeatmapData(heatmap);
                setEfficiencyData(efficiency);
                setQuizStats(quiz);
                setSubjectStats(subjects);
                setBloomStats(bloom);
                setSrsStats(srs);
                setFocusTrend(trend);
                setCumulativeStats(cumulativeData);
                setEfficiencySummary(effSummary);
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
                    <div className="flex items-center gap-5">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-linear-to-r rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative p-4 rounded-xl bg-card border border-border/50 leading-none flex items-center">
                                <TrendingUp className="w-8 h-8 text-primary" />
                            </div>
                        </div>
                        <div>
                            <h1
                                className="text-3xl md:text-4xl font-black text-foreground tracking-tight"
                                style={{ fontFamily: "var(--font-heading)" }}
                            >
                                Performans Analizi
                            </h1>
                            <p className="text-muted-foreground text-sm font-medium">
                                Öğrenme yolculuğunuzun detaylı grafikleri ve verimlilik metrikleri.
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats Summary */}
                    {dailyStats && (
                        <div className="relative group">
                            <div className="absolute -inset-0.5 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                            <div className="relative flex items-center gap-4 px-6 py-3 rounded-2xl bg-card border border-border/50 backdrop-blur-sm">
                                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                    <span className="text-xl leading-none">⚡</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black text-foreground tabular-nums">
                                        {Math.floor(dailyStats.totalWorkMinutes / 60)}s {dailyStats.totalWorkMinutes % 60}dk
                                    </div>
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        Bugünkü Çalışma
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>



            {/* Main Stats Grid */}
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
                    {/* Hero: Master Efficiency Card */}
                    <BentoCard colSpan={3} isClickable>
                        {efficiencySummary ? (
                            <MasterEfficiencyCard data={efficiencySummary} userId={userId} />
                        ) : (
                            <div className="flex h-40 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                    </BentoCard>

                    {/* Row 1: Daily Goals, Learning Overview, Efficiency */}
                    <BentoCard isClickable>
                        {dailyStats ? <DailyGoalCard data={dailyStats} /> : "Yükleniyor..."}
                    </BentoCard>

                    <BentoCard>
                        {quizStats ? <LearningOverview data={quizStats} /> : "Yükleniyor..."}
                    </BentoCard>

                    <BentoCard isAlarm={efficiencyData?.isAlarm} isClickable>
                        {efficiencyData ? (
                            <EfficiencyCard 
                                data={efficiencyData} 
                                cumulativeData={cumulativeStats}
                                userId={userId}
                                subjectData={subjectStats}
                            />
                        ) : "Veri yok"}
                    </BentoCard>

                    {/* Row 2: Radar, Focus Trend */}
                    <BentoCard>
                        <SubjectRadar data={subjectStats} />
                    </BentoCard>

                    <BentoCard colSpan={2}>
                        <FocusTrendChart data={focusTrend} />
                    </BentoCard>

                    {/* Row 3: SRS, Bloom, Heatmap */}
                    <BentoCard>
                        {srsStats ? <SRSDistribution data={srsStats} /> : "Yükleniyor..."}
                    </BentoCard>

                    <BentoCard>
                        <BloomAnalysis data={bloomStats} />
                    </BentoCard>

                    <BentoCard>
                        <ConsistencyHeatmap data={heatmapData} />
                    </BentoCard>
                </BentoGrid>
            )}

        </div>
    );
}
