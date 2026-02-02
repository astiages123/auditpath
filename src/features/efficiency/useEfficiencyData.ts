import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    BloomStats,
    CognitiveInsight,
    CourseMastery,
    DailyEfficiencySummary,
    DayActivity,
    EfficiencyTrend,
    getBloomStats,
    getCourseMastery,
    getDailyEfficiencySummary,
    getDailyStats,
    getEfficiencyTrend,
    getFocusTrend,
    getRecentActivitySessions,
    getRecentCognitiveInsights,
    getRecentQuizSessions,
    RecentQuizSession,
    RecentSession,
} from "@/shared/lib/core/client-db";
import { supabase } from "@/shared/lib/core/supabase";
import { BloomStat, LearningLoad, Session } from "./types";
import { getVirtualDateKey } from "@/shared/lib/utils/date-utils";

export function useEfficiencyData() {
    const { user } = useAuth();
    const [efficiencySummary, setEfficiencySummary] = useState<
        DailyEfficiencySummary | null
    >(null);
    const [bloomStats, setBloomStats] = useState<BloomStats[]>([]);

    // Multiple time ranges for Learning Load
    const [loadWeek, setLoadWeek] = useState<LearningLoad[]>([]);
    const [loadDay, setLoadDay] = useState<LearningLoad[]>([]);
    const [loadMonth, setLoadMonth] = useState<LearningLoad[]>([]);
    const [loadAll, setLoadAll] = useState<LearningLoad[]>([]);

    const [courseMastery, setCourseMastery] = useState<
        CourseMastery[]
    >([]);
    const [consistencyData, setConsistencyData] = useState<DayActivity[]>([]);
    const [efficiencyTrend, setEfficiencyTrend] = useState<EfficiencyTrend[]>(
        [],
    );
    const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
    const [recentQuizzes, setRecentQuizzes] = useState<RecentQuizSession[]>([]);
    const [cognitiveInsights, setCognitiveInsights] = useState<
        CognitiveInsight[]
    >([]);

    const [dailyGoalMinutes, setDailyGoalMinutes] = useState(200);
    const [todayVideoMinutes, setTodayVideoMinutes] = useState(0);
    const [todayVideoCount, setTodayVideoCount] = useState(0);
    const [videoTrendPercentage, setVideoTrendPercentage] = useState(0);
    const [trendPercentage, setTrendPercentage] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!user?.id) return;
            setLoading(true);
            try {
                const [
                    summary,
                    bloom,
                    daily,
                    focusTrend,
                    mastery,
                    effTrend,
                    recent,
                    quizzes,
                    cognitive,
                ] = await Promise.all([
                    getDailyEfficiencySummary(user.id),
                    getBloomStats(user.id),
                    getDailyStats(user.id),
                    getFocusTrend(user.id),
                    getCourseMastery(user.id),
                    getEfficiencyTrend(user.id),
                    getRecentActivitySessions(user.id, 100),
                    getRecentQuizSessions(user.id, 50),
                    getRecentCognitiveInsights(user.id, 30),
                ]);

                setEfficiencySummary(summary);
                setBloomStats(bloom);
                setCourseMastery(mastery);
                setEfficiencyTrend(effTrend);
                setRecentSessions(recent);
                setRecentQuizzes(quizzes);
                setCognitiveInsights(cognitive);

                if (daily) {
                    setDailyGoalMinutes(daily.goalMinutes || 200);
                    setTodayVideoMinutes(daily.totalVideoMinutes || 0);
                    setTodayVideoCount(daily.completedVideos || 0);
                    setVideoTrendPercentage(daily.videoTrendPercentage || 0);
                    setTrendPercentage(daily.trendPercentage || 0);
                }

                // --- Calculate Learning Load (Ranges) ---

                const queryStartDate = new Date();
                queryStartDate.setMonth(queryStartDate.getMonth() - 6); // 6 months back for "All Time"
                const queryStartDateStr = queryStartDate.toISOString();

                // 1. Fetch Pomodoro Sessions (This is now the SOLE source for Odaklanma Trendi)
                const { data: recentSessionsData } = await supabase
                    .from("pomodoro_sessions")
                    .select("started_at, total_work_time")
                    .eq("user_id", user.id)
                    .gte("started_at", queryStartDateStr);

                const focusDailyMap: Record<string, number> = {};
                recentSessionsData?.forEach((s) => {
                    // Use standard calendar day (no 4AM shift) for chart clarity
                    const d = new Date(s.started_at);
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    const dateKey = `${year}-${month}-${day}`;

                    const mins = Math.round((s.total_work_time || 0) / 60);
                    focusDailyMap[dateKey] = (focusDailyMap[dateKey] || 0) +
                        mins;
                });

                // Helper to assemble chart data for a range of dates
                const assembleData = (daysCount: number) => {
                    const rawData: (LearningLoad & { rawDate: Date })[] = [];
                    for (let i = daysCount - 1; i >= 0; i--) {
                        const d = new Date();
                        // Reset time to ensure we step back correctly in days
                        d.setHours(12, 0, 0, 0); // Use noon to avoid DST/midnight issues
                        d.setDate(d.getDate() - i);

                        // Standard calendar format: YYYY-MM-DD
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, "0");
                        const day = String(d.getDate()).padStart(2, "0");
                        const dateKey = `${year}-${month}-${day}`;

                        const dayName = d.toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                        });

                        rawData.push({
                            day: i === 0 ? "Bugün" : dayName,
                            videoMinutes: 0, // Removed video data explicitly
                            extraStudyMinutes: Math.round(
                                focusDailyMap[dateKey] || 0,
                            ),
                            rawDate: new Date(d),
                        });
                    }

                    // Apply Weekend Filter: Hide any Saturday or Sunday that has 0 total activity
                    if (daysCount > 1) {
                        return rawData.filter((item) => {
                            const d = item.rawDate;
                            const dayOfWeek = d.getDay(); // 0: Sunday, 6: Saturday
                            const totalMins = item.extraStudyMinutes; // Only check study minutes

                            // If it's a weekend day and has no activity, hide it
                            if (
                                totalMins === 0 &&
                                (dayOfWeek === 0 || dayOfWeek === 6)
                            ) {
                                return false;
                            }
                            return true;
                        });
                    }

                    return rawData;
                };

                setLoadDay(assembleData(1));

                // Fetch extra days (12) to account for potential hidden weekends,
                // ensuring we can show exactly 7 visible days on the chart.
                const weekRaw = assembleData(12);
                setLoadWeek(weekRaw.slice(-7));

                setLoadMonth(assembleData(30));

                // "All Time": Group by Month for the last 6 months
                const allTimeData: LearningLoad[] = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const monthName = d.toLocaleDateString("tr-TR", {
                        month: "long",
                    });

                    // Sum all days in this month
                    let fSum = 0;

                    Object.keys(focusDailyMap).forEach((key) => {
                        const keyDate = new Date(key);
                        if (
                            keyDate.getMonth() === d.getMonth() &&
                            keyDate.getFullYear() === d.getFullYear()
                        ) {
                            fSum += focusDailyMap[key] || 0;
                        }
                    });

                    allTimeData.push({
                        day: monthName,
                        videoMinutes: 0,
                        extraStudyMinutes: Math.round(fSum),
                    });
                }
                setLoadAll(allTimeData);

                // --- Calculate Consistency Data (Last 35 Days / 5 Weeks) ---
                const rawHeatmap: DayActivity[] = [];
                const todayForLoop = new Date();

                for (let i = 34; i >= 0; i--) {
                    const d = new Date(todayForLoop);
                    d.setDate(todayForLoop.getDate() - i);

                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const dayFormatted = String(d.getDate()).padStart(2, "0");
                    const dateKey = `${year}-${month}-${dayFormatted}`;

                    const virtualKey = getVirtualDateKey(d);
                    const mins = focusDailyMap[virtualKey] || 0;

                    rawHeatmap.push({
                        date: dateKey,
                        totalMinutes: mins,
                        count: mins > 0 ? 1 : 0,
                        level: 0,
                        intensity: 0,
                    });
                }

                // Filter out weekend off-days:
                // If Sat is 0 and Sun > 0, hide Sat.
                // If Sun is 0 and Sat > 0, hide Sun.
                const filteredHeatmap = rawHeatmap.filter((day, idx, arr) => {
                    const d = new Date(day.date);
                    const dayOfWeek = d.getDay(); // 0: Sunday, 6: Saturday
                    const mins = day.totalMinutes || 0;

                    if (mins === 0) {
                        if (dayOfWeek === 6) { // Saturday
                            const nextDay = arr[idx + 1];
                            if (nextDay && (nextDay.totalMinutes || 0) > 0) {
                                return false;
                            }
                        }
                        if (dayOfWeek === 0) { // Sunday
                            const prevDay = arr[idx - 1];
                            if (prevDay && (prevDay.totalMinutes || 0) > 0) {
                                return false;
                            }
                        }
                    }
                    return true;
                });

                setConsistencyData(filteredHeatmap);
            } catch (error) {
                console.error("Failed to fetch efficiency data", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [user?.id]);

    // Transform to View Models

    const formattedSessions: Session[] = useMemo(() => {
        if (!efficiencySummary?.sessions) return [];

        return efficiencySummary.sessions.map((s) => {
            const startDate = new Date(s.startedAt);
            const totalDurationSec = s.workTimeSeconds + s.breakTimeSeconds +
                s.pauseTimeSeconds;
            const endDate = new Date(
                startDate.getTime() + totalDurationSec * 1000,
            );

            return {
                id: s.id,
                lessonName: s.courseName || "Genel Çalışma",
                date: startDate.toISOString().split("T")[0],
                startTime: startDate.toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                endTime: endDate.toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                duration: Math.round(s.workTimeSeconds / 60),
                pauseIntervals: [],
            };
        });
    }, [efficiencySummary]);

    const bloomRadarData: BloomStat[] = useMemo(() => {
        const order = [
            "Hatırla",
            "Anla",
            "Uygula",
            "Analiz",
            "Değerlendir",
            "Yarat",
        ];
        const mapLevel: Record<string, string> = {
            "Knowledge": "Hatırla",
            "Comprehension": "Anla",
            "Application": "Uygula",
            "Analysis": "Analiz",
            "Evaluation": "Değerlendir",
            "Creation": "Yarat",
        };

        if (!bloomStats || bloomStats.length === 0) {
            return order.map((l) => ({
                level: l,
                score: 0,
                questionsSolved: 0,
            }));
        }

        return bloomStats.map((b) => ({
            level: mapLevel[b.level] || b.level,
            score: b.score,
            questionsSolved: b.correct,
        })).sort((a, b) => {
            return order.indexOf(a.level) - order.indexOf(b.level);
        });
    }, [bloomStats]);

    const lessonMastery = useMemo(() => {
        return courseMastery.map((m) => ({
            lessonId: m.courseId,
            title: m.courseName,
            mastery: m.masteryScore,
            videoProgress: m.videoProgress,
            questionProgress: m.questionProgress,
            goal: 100,
        }));
    }, [courseMastery]);

    // Calculate Cognitive Focus Score & Insights
    const cognitiveAnalysis = useMemo(() => {
        if (!cognitiveInsights.length) return null;

        let totalCorrect = 0;
        let totalAttempts = 0;
        let totalConsecutiveFails = 0;
        const confusedConceptsMap = new Map<string, number>();

        cognitiveInsights.forEach((c) => {
            totalAttempts++;
            if (c.responseType === "correct") totalCorrect++;

            // Count consecutive fails (accumulate)
            totalConsecutiveFails += c.consecutiveFails;

            // Extract Concepts from Diagnosis
            // Heuristic: "X ile Y karıştırılıyor" or simple grouping by diagnosis text
            if (c.diagnosis) {
                const diag = c.diagnosis;
                confusedConceptsMap.set(
                    diag,
                    (confusedConceptsMap.get(diag) || 0) + 1,
                );
            }
        });

        // Calculate Score
        // Formula: (Correct / Attempts * 100) - (ConsecutiveFails * 5)
        const rawScore = totalAttempts > 0
            ? (totalCorrect / totalAttempts) * 100
            : 0;
        const penalty = totalConsecutiveFails * 5;
        const focusScore = Math.max(0, Math.round(rawScore - penalty));

        // Get Top Confused Concepts
        const topConfused = Array.from(confusedConceptsMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([text, count]) => ({ text, count }));

        // Get Recent Insights (Unique)
        const recentInsights = Array.from(
            new Set(
                cognitiveInsights
                    .map((c) => c.insight)
                    .filter(Boolean),
            ),
        ).slice(0, 5); // Start with string extraction

        // Scaffolding Alerts
        const criticalTopics = cognitiveInsights
            .filter((c) => c.consecutiveFails >= 2)
            .map((c) => ({
                id: c.questionId,
                fails: c.consecutiveFails,
                diagnosis: c.diagnosis,
            }))
            .slice(0, 3); // Top 3 critical

        return {
            focusScore,
            topConfused,
            recentInsights,
            criticalTopics,
            hasData: true,
        };
    }, [cognitiveInsights]);

    // --- Mastery Chain Calculation ---
    const [masteryChainStats, setMasteryChainStats] = useState<
        {
            totalChains: number;
            resilienceBonusDays: number;
            nodes: any[];
            edges: any[];
        } | null
    >(null);

    useEffect(() => {
        async function fetchMasteryChains() {
            if (!user?.id) return;

            // 1. Fetch Concept Maps (from note_chunks)
            const { data: chunksData } = await supabase
                .from("note_chunks")
                .select("id, metadata, course_id")
                .not("metadata", "is", null);

            // 2. Fetch Chunk Mastery
            const { data: masteryData } = await supabase
                .from("chunk_mastery")
                .select("chunk_id, mastery_score")
                .eq("user_id", user.id);

            if (!chunksData) return;

            // Map Chunk Mastery
            const chunkMasteryMap = new Map<string, number>();
            masteryData?.forEach((m) => {
                chunkMasteryMap.set(m.chunk_id, m.mastery_score);
            });

            // Flatten ALL Concepts and assign scores
            // Logic: Concept Score = Chunk Score (Approximation)
            const allConcepts: any[] = [];
            const conceptScoreMap: Record<string, number> = {};

            chunksData.forEach((chunk) => {
                const metadata = chunk.metadata as any;
                if (
                    metadata?.concept_map && Array.isArray(metadata.concept_map)
                ) {
                    const score = chunkMasteryMap.get(chunk.id) || 0;

                    metadata.concept_map.forEach((c: any) => {
                        allConcepts.push(c);
                        // Store max score if concept appears in multiple chunks (unlikely but safe)
                        const current = conceptScoreMap[c.baslik] || 0;
                        conceptScoreMap[c.baslik] = Math.max(current, score);
                    });
                }
            });

            // Dynamically import logic to avoid top-level SSR issues if any
            const { calculateMasteryChains, processGraphForAtlas } =
                await import("./logic/mastery-logic");

            const rawNodes = calculateMasteryChains(
                allConcepts,
                conceptScoreMap,
            );
            const stats = processGraphForAtlas(rawNodes);

            setMasteryChainStats(stats);
        }

        fetchMasteryChains();
    }, [user?.id]);

    return {
        loading,
        sessions: formattedSessions,
        bloomStats: bloomRadarData,
        learningLoad: loadWeek, // Default for backward compatibility
        loadDay,
        loadWeek,
        loadMonth,
        loadAll,
        lessonMastery,
        consistencyData,
        dailyGoalMinutes,
        currentWorkMinutes: Math.round(
            (efficiencySummary?.netWorkTimeSeconds || 0) / 60,
        ),
        todayVideoMinutes,
        todayVideoCount,
        todayVideoCountRaw: todayVideoCount, // Expose raw count if needed
        videoTrendPercentage,
        efficiencyScore: efficiencySummary?.efficiencyScore || 0,
        efficiencyTrend,
        recentSessions,
        recentQuizzes,
        trendPercentage,
        cognitiveAnalysis,
        masteryChainStats, // New Data
    };
}
