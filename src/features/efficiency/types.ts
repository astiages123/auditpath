export type Session = {
    id: string;
    lessonName: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    duration: number; // minutes
    timeline?: {
        type: string;
        start: number;
        end: number;
        duration?: number;
    }[];
    pauseIntervals: { start: string; end: string }[]; // Pause times
};

export type BloomStat = {
    level: string; // Hatırla, Anla, Uygula, Analiz Et, Değerlendir, Yarat
    score: number; // 0-100
    questionsSolved: number;
};

export type LearningLoad = {
    day: string;
    videoMinutes: number;
    extraStudyMinutes: number; // Test solving, reading etc.
};

export type FocusPowerPoint = {
    date: string; // Day or Month label
    originalDate: string; // ISO Date for sorting
    score: number;
    workMinutes: number;
    breakMinutes: number;
    pauseMinutes: number;
};
