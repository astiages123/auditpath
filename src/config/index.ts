import { logger } from "@/utils/logger";
import type { Rank } from "@/types";

// --- Environment Configuration (formerly env.ts) ---

// Extend global types for process.env
export interface ProcessEnv {
    [key: string]: string | undefined;
}

// Helper to safely get env vars in both Vite (client) and Node (scripts)
const getEnv = (key: string): string | undefined => {
    if (typeof import.meta !== "undefined" && import.meta.env) {
        return import.meta.env[key];
    }
    // Node.js environment - safely check for process
    const globalProcess = globalThis as { process?: { env: ProcessEnv } };
    if (globalProcess.process?.env) {
        return globalProcess.process.env[key];
    }
    return undefined;
};

// Validate and get environment variables with proper error handling
const getRequiredEnvVar = (key: string): string => {
    const value = getEnv(key);
    if (!value) {
        if (getEnv("PROD") || getEnv("NODE_ENV") === "production") {
            throw new Error(`Missing required environment variable: ${key}`);
        }
        // Safe console warning - only in development using logger
        if (typeof logger !== "undefined" && logger.warn) {
            logger.warn(
                `Warning: Missing environment variable ${key}. Using empty string.`,
            );
        }
        return "";
    }
    return value;
};

export const env = {
    supabase: {
        url: getRequiredEnvVar("VITE_SUPABASE_URL"),
        anonKey: getRequiredEnvVar("VITE_SUPABASE_ANON_KEY"),
    },
    ai: {
        // AI keys are handled by Supabase Edge Functions (ai-proxy)
        // and should NEVER be exposed to the client.
    },
    app: {
        env: getEnv("MODE") || getEnv("NODE_ENV"),
        isDev: getEnv("DEV") || getEnv("NODE_ENV") === "development",
        isProd: getEnv("PROD") || getEnv("NODE_ENV") === "production",
        siteUrl: getEnv("VITE_SITE_URL") ||
            (typeof window !== "undefined" ? window.location.origin : ""),
    },
} as const;

// Type validation
if (!env.supabase.url || !env.supabase.anonKey) {
    // In development, we might not have these if just testing UI
    if (env.app.isProd) {
        throw new Error(
            "Missing required environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY",
        );
    }
}

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

// --- Routes (formerly routes.ts) ---

export const ROUTES = {
    HOME: "/",
    COURSES: "/",
    ACHIEVEMENTS: "/achievements",
    STATISTICS: "/statistics",
    EFFICIENCY: "/efficiency",
    ANALYTICS: "/analytics",
    SETTINGS: "/settings",
    NOTES: "/notes",
} as const;
