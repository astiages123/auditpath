import type { Rank } from "@/types/auth";

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
    motto: "Bilginin krallığından uzakta, sislerin içinde yolunu arıyorsun.",
    imagePath: "/ranks/rank1.webp",
    order: 1,
  },
  {
    id: "2",
    name: "Yazıcı",
    minPercentage: 25,
    color: "text-amber-700",
    motto: "Kadim metinleri kopyalayarak bilgeliğin izlerini sürmeye başladın.",
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

// --- Quiz Configuration ---

// Efficiency / Gamification Constants
export const DAILY_GOAL_MINUTES = 200;

/**
 * Efficiency thresholds for learning flow analysis.
 * Symmetric around 1.0x (Optimal)
 */
export const EFFICIENCY_THRESHOLDS = {
  STUCK: 0.25, // < 0.25: Critical Slow (Rose)
  DEEP: 0.75, // 0.25 - 0.75: Warning Slow (Amber)
  OPTIMAL_MIN: 0.75, // 0.75 - 1.25: Ideal (Emerald)
  OPTIMAL_MAX: 1.25,
  SPEED: 1.75, // 1.25 - 1.75: Warning Fast (Amber)
  SHALLOW: 1.75, // > 1.75: Critical Fast (Rose)
};

export const EXAM_STRATEGY: Record<
  string,
  { importance: "high" | "medium" | "low" }
> = {
  "mikro-iktisat": { importance: "high" },
  "makro-iktisat": { importance: "high" },
  "para-banka-ve-kredi": { importance: "high" },
  "uluslararasi-ticaret": { importance: "low" },
  "turkiye-ekonomisi": { importance: "low" },
  "medeni-hukuk": { importance: "medium" },
  "borclar-hukuku": { importance: "high" },
  "ticaret-hukuku": { importance: "high" },
  "icra-ve-iflas-hukuku": { importance: "medium" },
  "turk-ceza-kanunu": { importance: "low" },
  "medeni-usul-hukuku": { importance: "low" },
  "is-hukuku": { importance: "low" },
  "bankacilik-hukuku": { importance: "high" },
  "genel-muhasebe": { importance: "high" },
  "maliye-teorisi": { importance: "medium" },
  "banka-muhasebesi": { importance: "high" },
  "isletme-yonetimi": { importance: "low" },
  "pazarlama-yonetimi": { importance: "low" },
  "finansal-yonetim": { importance: "high" },
  matematik: { importance: "high" },
  "finans-matematigi": { importance: "high" },
  istatistik: { importance: "medium" },
  ingilizce: { importance: "high" },
  "sozel-mantik": { importance: "low" },
};

export type CourseCategory = "SKILL_BASED" | "SCENARIO_BASED" | "THEORY_BASED";

export const CATEGORY_MAPPINGS: Record<string, CourseCategory> = {
  İngilizce: "SKILL_BASED",
  "Sözel Mantık": "SKILL_BASED",
  Matematik: "SKILL_BASED",
  "Sayısal Mantık": "SKILL_BASED",
  İstatistik: "SKILL_BASED",
  "Medeni Hukuk": "SCENARIO_BASED",
  "Borçlar Hukuku": "SCENARIO_BASED",
  "Ticaret Hukuku": "SCENARIO_BASED",
  "Bankacılık Hukuku": "SCENARIO_BASED",
  "İcra ve İflas Hukuku": "SCENARIO_BASED",
  "Türk Ceza Kanunu": "SCENARIO_BASED",
  "İş Hukuku": "SCENARIO_BASED",
  "Medeni Usul Hukuku": "SCENARIO_BASED",
  "Genel Muhasebe": "SCENARIO_BASED",
  "Banka Muhasebesi": "SCENARIO_BASED",
  "Finans Matematiği": "SCENARIO_BASED",
  "Finansal Yönetim": "SCENARIO_BASED",
  "Mikro İktisat": "THEORY_BASED",
  "Makro İktisat": "THEORY_BASED",
  "Para, Banka ve Kredi": "THEORY_BASED",
  "Uluslararası Ticaret": "THEORY_BASED",
  "Türkiye Ekonomisi": "THEORY_BASED",
  "Maliye Teorisi": "THEORY_BASED",
  "İşletme Yönetimi": "THEORY_BASED",
  "Pazarlama Yönetimi": "THEORY_BASED",
};

export const DEFAULT_CATEGORY: CourseCategory = "THEORY_BASED";

export const CATEGORY_DISTRIBUTIONS: Record<
  CourseCategory,
  ("knowledge" | "application" | "analysis")[]
> = {
  SKILL_BASED: [
    "knowledge",
    "application",
    "application",
    "application",
    "application",
    "application",
    "application",
    "analysis",
    "analysis",
    "analysis",
  ],
  SCENARIO_BASED: [
    "knowledge",
    "knowledge",
    "application",
    "application",
    "application",
    "application",
    "application",
    "application",
    "analysis",
    "analysis",
  ],
  THEORY_BASED: [
    "knowledge",
    "knowledge",
    "application",
    "application",
    "application",
    "application",
    "application",
    "application",
    "analysis",
    "analysis",
  ],
};
