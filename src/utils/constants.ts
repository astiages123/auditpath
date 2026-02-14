import type { Rank } from "@/types";

// --- Constants (formerly constants.ts) ---

// Timer durations in seconds
export const POMODORO_WORK_DURATION_SECONDS = 3000; // 50 minutes
export const POMODORO_BREAK_DURATION_SECONDS = 600; // 10 minutes

// Session validity duration in milliseconds (12 hours)
export const SESSION_VALIDITY_DURATION_MS = 12 * 60 * 60 * 1000;

// Quiz limits
export const DAILY_QUOTA = 50;
export const MASTERY_THRESHOLD = 80;
export const MAX_LOG_ENTRIES = 50;

export const RANKS: Rank[] = [
    {
        id: "1",
        name: "Sürgün",
        minPercentage: 0,
        color: "text-slate-500",
        motto:
            "Bilginin krallığından uzakta, sislerin içinde yolunu arıyorsun.",
        imagePath: "/ranks/rank1.webp",
        order: 1,
    },
    {
        id: "2",
        name: "Yazıcı",
        minPercentage: 25,
        color: "text-amber-700",
        motto:
            "Kadim metinleri kopyalayarak bilgeliğin izlerini sürmeye başladın.",
        imagePath: "/ranks/rank2.webp",
        order: 2,
    },
    {
        id: "3",
        name: "Sınır Muhafızı",
        minPercentage: 50,
        color: "text-blue-400",
        motto:
            "Bilgi krallığının sınırlarını koruyor, cehaletin gölgeleriyle savaşıyorsun.",
        imagePath: "/ranks/rank3.webp",
        order: 3,
    },
    {
        id: "4",
        name: "Yüce Bilgin",
        minPercentage: 75,
        color: "text-purple-500",
        motto:
            "Görünmeyeni görüyor, bilinmeyeni biliyorsun. Hikmetin ışığı sensin.",
        imagePath: "/ranks/rank4.webp",
        order: 4,
    },
];
