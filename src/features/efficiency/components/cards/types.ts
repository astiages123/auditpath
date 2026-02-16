import {
    BloomStats,
    DayActivity,
    EfficiencyTrend,
    FocusPowerPoint,
    LearningLoad,
    RecentSession,
    Session,
} from "../../types";

export interface EfficiencyData {
    loading: boolean;
    currentWorkMinutes: number;
    todayVideoMinutes: number;
    todayVideoCount: number;
    videoTrendPercentage: number;
    sessions: Session[]; // Changed from RecentSession[] to Session[] to match usage
    dailyGoalMinutes: number;
    efficiencyTrend: EfficiencyTrend[];
    trendPercentage: number;
    learningFlow: number;
    flowState: string;
    goalProgress: number;
    loadWeek: LearningLoad[];
    loadDay: LearningLoad[];
    loadMonth: LearningLoad[];
    loadAll: LearningLoad[];
    bloomStats: BloomStats[];
    lessonMastery: {
        lessonId: string;
        title: string;
        mastery: number;
        videoProgress: number;
        questionProgress: number;
    }[];
    consistencyData: DayActivity[];
    recentSessions: RecentSession[];
    focusPowerWeek: FocusPowerPoint[];
    focusPowerMonth: FocusPowerPoint[];
    focusPowerAll: FocusPowerPoint[];
}
