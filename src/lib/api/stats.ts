
import { supabase } from '@/lib/supabase';

// --- Types ---

export interface KPIStats {
    masteryScore: number;       // 0-100
    avgSpeed: number;           // seconds per question
    totalCompleted: number;     // Total archived questions
    totalSessions: number;      // Total sessions completed
    speedChange: number;        // Percentage change vs last week/period
    totalReviewQuestions: number; // Questions answered from review queue (Backfill/Refresher)
}

export interface SpeedTrendPoint {
    session: string;            // "Session 1", "Session 2", or Date
    avgSpeed: number;           // seconds
}

export interface LessonPerformance {
    subject: string;
    avgSpeed: number;
    mastery: number;
    totalQuestions: number;
}

export interface StatusDistribution {
    status: 'active' | 'archived' | 'pending_followup';
    count: number;
    fill: string; // Color code for chart
}

export interface Insight {
    type: 'strength' | 'weakness' | 'neutral';
    title: string;
    description: string;
}

export interface DashboardStats {
    kpi: KPIStats;
    speedTrend: SpeedTrendPoint[];
    lessonPerformance: LessonPerformance[];
    statusDistribution: StatusDistribution[];
    insights: Insight[];
}

// --- Helper Functions ---

/**
 * Main aggregator function for User Dashboard
 */
export async function getUserDashboardStats(userId: string): Promise<DashboardStats | null> {
    try {
        // 1. Fetch KPI Data (Parallel Fetching)
        const [
            masteryData,
            progressData,
            archivedCount,
            totalSessionsCount,
            reviewCountData
        ] = await Promise.all([
            // Mastery Score (Avg of all chunk mastery)
            supabase.from('chunk_mastery').select('mastery_score').eq('user_id', userId),
            
            // Speed & Activity (From user_quiz_progress)
            supabase.from('user_quiz_progress')
                .select('time_spent_ms, session_number, answered_at, course_id')
                .eq('user_id', userId)
                .order('answered_at', { ascending: true }), // Sorted for trend
                
            // Total Completed (Archived Questions for User)
            supabase.from('user_question_status')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'archived'), 

             // Total Sessions (Sum of current_session counters)
             supabase.from('course_session_counters')
                .select('current_session')
                .eq('user_id', userId),
             
             // Total Review Questions (is_review_question = true)
             supabase.from('user_quiz_progress')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_review_question', true)
        ]);

        // --- Process KPI ---
        
        // Mastery
        const masteryScores = masteryData.data?.map(m => m.mastery_score) || [];
        const avgMastery = masteryScores.length > 0 
            ? Math.round(masteryScores.reduce((a, b) => a + b, 0) / masteryScores.length) 
            : 0;

        // Speed (Avg Seconds)
        // Filter out absurdly high times (e.g. > 5 mins) if any, to avoid skew
        const validTimes = progressData.data?.filter(p => p.time_spent_ms && p.time_spent_ms < 300000).map(p => p.time_spent_ms!) || [];
        const avgSpeedMs = validTimes.length > 0 
            ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length 
            : 0;
        const avgSpeedSec = Math.round(avgSpeedMs / 1000);

        // Speed Change (Last 50 vs Previous 50 or similar split)
        let speedChange = 0;
        if (validTimes.length > 10) {
            const mid = Math.floor(validTimes.length / 2);
            const firstHalf = validTimes.slice(0, mid);
            const secondHalf = validTimes.slice(mid);
            const avg1 = firstHalf.reduce((a,b)=>a+b,0)/firstHalf.length;
            const avg2 = secondHalf.reduce((a,b)=>a+b,0)/secondHalf.length;
            // Negative change means faster (good), but usually "speed" in UI is "questions/min" or "sec/q".
            // If metric is "sec/question", lower is better. 
            // Calculated as (New - Old) / Old * 100. 
            // If New (5s) < Old (10s), change is -50%.
            speedChange = Math.round(((avg2 - avg1) / avg1) * 100);
        }

        // Total Completed
        const totalCompleted = archivedCount.count || 0;

        // Total Sessions
        const totalSessions = totalSessionsCount.data?.reduce((acc, curr) => acc + (curr.current_session || 0), 0) || 0;

        // --- Process Charts ---

        // 1. Speed Trend (Group by Session Number)
        const speedMap = new Map<number, { total: number; count: number }>();
        progressData.data?.forEach(p => {
            if (p.time_spent_ms && p.session_number) {
                const current = speedMap.get(p.session_number) || { total: 0, count: 0 };
                current.total += p.time_spent_ms;
                current.count += 1;
                speedMap.set(p.session_number, current);
            }
        });

        const speedTrend: SpeedTrendPoint[] = Array.from(speedMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([session, data]) => ({
                session: `S${session}`,
                avgSpeed: Math.round((data.total / data.count) / 1000)
            }));

        // 2. Lesson Performance (Group by Course ID)
        // Need Course Names
        const { data: courses } = await supabase.from('courses').select('id, name');
        const courseNameMap = new Map(courses?.map(c => [c.id, c.name]));

        const lessonMap = new Map<string, { totalTime: number; count: number }>();
        progressData.data?.forEach(p => {
            if (p.time_spent_ms && p.course_id) {
                const current = lessonMap.get(p.course_id) || { totalTime: 0, count: 0 };
                current.totalTime += p.time_spent_ms;
                current.count += 1;
                lessonMap.set(p.course_id, current);
            }
        });

        // Calculate mastery per course (aggregating chunk_mastery for current user)
        const courseMasteryMap = new Map<string, { totalScore: number; count: number }>();
        const { data: allChunkMasteries } = await supabase.from('chunk_mastery').select('course_id, mastery_score').eq('user_id', userId);
        allChunkMasteries?.forEach(m => {
            const current = courseMasteryMap.get(m.course_id) || { totalScore: 0, count: 0 };
            current.totalScore += m.mastery_score;
            current.count += 1;
            courseMasteryMap.set(m.course_id, current);
        });

        const lessonPerformance: LessonPerformance[] = [];
        for (const [courseId, perf] of lessonMap.entries()) {
            const masteryData = courseMasteryMap.get(courseId);
            const masteryAvg = masteryData ? Math.round(masteryData.totalScore / masteryData.count) : 0;
            const name = courseNameMap.get(courseId) || 'Unknown';
            
            lessonPerformance.push({
                subject: name,
                avgSpeed: Math.round((perf.totalTime / perf.count) / 1000),
                mastery: masteryAvg,
                totalQuestions: perf.count
            });
        }

        // 3. Status Distribution
        // Active = Total Questions - (Archived + Pending for this User)
        // Archived = user_question_status.archived
        // Pending = user_question_status.pending_followup
        
        const [totalQuestions, useStatusCounts] = await Promise.all([
             supabase.from('questions').select('*', { count: 'exact', head: true }),
             supabase.from('user_question_status')
                .select('status')
                .eq('user_id', userId)
        ]);

        const totalQ = totalQuestions.count || 0;
        const userStatuses = (useStatusCounts.data as unknown as { status: string }[]) || [];
        
        const archivedCountVal = userStatuses.filter(s => s.status === 'archived').length;
        const pendingCountVal = userStatuses.filter(s => s.status === 'pending_followup').length;
        // Any row in status table means it's NOT default active.
        // So Active = Total - (Archived + Pending + any other status if exists)
        // Actually Active = Total - userStatuses.length?
        // Wait, what if status is 'active' explicitly in table?
        // My session manager implementation upserts 'active' sometimes (e.g. Blank -> Active).
        // So `user_question_status` MIGHT contain 'active'.
        // Logic:
        // Real Active = (Questions without Status Row) + (Questions with Status Row == 'active')
        // Real Active = (TotalQ - userStatuses.length) + (userStatuses.filter('active').length)
        //             = TotalQ - userStatuses.filter(s => s != 'active').length
        
        const explicitActiveCount = userStatuses.filter(s => s.status === 'active').length;
        const nonActiveStatusCount = userStatuses.length - explicitActiveCount;
        
        const realActiveCount = totalQ - nonActiveStatusCount;

        const statusDistribution: StatusDistribution[] = [
            { status: 'active', count: realActiveCount, fill: '#3b82f6' }, // Blue
            { status: 'pending_followup', count: pendingCountVal, fill: '#ef4444' }, // Red
            { status: 'archived', count: archivedCountVal, fill: '#22c55e' }, // Green
        ];

        // --- Process Insights ---
        const insights: Insight[] = [];

        // 1. Top Time Spent
        const slowestLesson = [...lessonPerformance].sort((a, b) => b.avgSpeed - a.avgSpeed)[0];
        if (slowestLesson) {
            insights.push({
                type: 'weakness',
                title: 'Zaman Yönetimi Uyarısı',
                description: `"${slowestLesson.subject}" dersinde soru başına ortalama ${slowestLesson.avgSpeed}sn harcıyorsun. Biraz hızlanmayı dene!`
            });
        }

        // 2. Speed Improvement
        if (speedChange < -10) {
            insights.push({
                type: 'strength',
                title: 'Hızlanıyorsun!',
                description: `Genel çözüm hızın geçen döneme göre %${Math.abs(speedChange)} arttı. Harika gidiyorsun!`
            });
        }

        // 3. Mastery Alert
        const lowestMastery = [...lessonPerformance].sort((a,b) => a.mastery - b.mastery)[0];
        if (lowestMastery && lowestMastery.mastery < 50) {
             insights.push({
                type: 'neutral',
                title: 'Tekrar Önerisi',
                description: `"${lowestMastery.subject}" ustalık puanın henüz ${lowestMastery.mastery}/100. Bu derse biraz daha ağırlık verebilirsin.`
            });
        }


        return {
            kpi: {
                masteryScore: avgMastery,
                avgSpeed: avgSpeedSec,
                totalCompleted,
                totalSessions,
                speedChange,
                totalReviewQuestions: reviewCountData.count || 0
            },
            speedTrend,
            lessonPerformance,
            statusDistribution,
            insights
        };

    } catch (err) {
        console.error("Error aggregating dashboard stats:", err);
        return null; // Handle error gracefully in UI
    }
}
