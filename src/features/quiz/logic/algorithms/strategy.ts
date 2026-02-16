import type { Database } from "@/types/database.types";
import {
    BLOOM_INSTRUCTIONS,
    CATEGORY_DISTRIBUTIONS,
    CATEGORY_MAPPINGS,
    type CourseCategory,
    DEFAULT_CATEGORY,
    EXAM_STRATEGY,
} from "@/utils/constants";
import { type ConceptMapItem } from "@/features/quiz/types/quizTypes";

// --- Types ---
export type BloomLevel = Database["public"]["Enums"]["bloom_level"];

export interface ExamSubjectWeight {
    subject?: string;
    importance: "high" | "medium" | "low";
    examTotal?: number;
}

export interface AdvancedScoreResult {
    baseDelta: number;
    finalScore: number;
    bloomCoeff: number;
    timeRatio: number;
}

// --- Constants ---
const BLOOM_COEFFICIENTS: Record<BloomLevel, number> = {
    knowledge: 1.0,
    application: 1.3,
    analysis: 1.6,
};

const TARGET_TIMES_MS: Record<BloomLevel, number> = {
    knowledge: 20_000,
    application: 35_000,
    analysis: 50_000,
};

const DIFFICULTY_MULTIPLIERS: Record<BloomLevel, number> = {
    knowledge: 1.0,
    application: 1.2,
    analysis: 1.5,
};

// --- Strategy Logic ---

export function getSubjectStrategy(
    courseName: string,
): ExamSubjectWeight | undefined {
    const normalizedName = courseName
        .trim()
        .toLowerCase()
        .replace(/,/g, "")
        .replace(/ /g, "-")
        .replace(/ı/g, "i")
        .replace(/i̇/g, "i")
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c");

    return (
        EXAM_STRATEGY[normalizedName] || EXAM_STRATEGY[courseName] || undefined
    );
}

export function getCourseCategory(courseName: string): CourseCategory {
    return CATEGORY_MAPPINGS[courseName] || DEFAULT_CATEGORY;
}

export function determineNodeStrategy(
    index: number,
    concept?: ConceptMapItem,
    courseName: string = "",
): {
    bloomLevel: "knowledge" | "application" | "analysis";
    instruction: string;
} {
    if (concept?.seviye) {
        if (concept.seviye === "Analiz") {
            return {
                bloomLevel: "analysis",
                instruction: BLOOM_INSTRUCTIONS.analysis,
            };
        }
        if (concept.seviye === "Uygulama") {
            return {
                bloomLevel: "application",
                instruction: BLOOM_INSTRUCTIONS.application,
            };
        }
        if (concept.seviye === "Bilgi") {
            return {
                bloomLevel: "knowledge",
                instruction: BLOOM_INSTRUCTIONS.knowledge,
            };
        }
    }

    const category = getCourseCategory(courseName);
    const distribution = CATEGORY_DISTRIBUTIONS[category];
    const cycleIndex = index % 10;
    const targetBloomLevel = distribution[cycleIndex];

    return {
        bloomLevel: targetBloomLevel,
        instruction: BLOOM_INSTRUCTIONS[targetBloomLevel],
    };
}

export function calculateAdvancedScore(
    deltaP: number,
    bloomLevel: BloomLevel,
    timeSpentMs: number,
): AdvancedScoreResult {
    const bloomCoeff = BLOOM_COEFFICIENTS[bloomLevel];
    const tTarget = TARGET_TIMES_MS[bloomLevel];
    const tActual = Math.max(timeSpentMs, 1000);

    const timeRatio = Math.min(2.0, Math.max(0.5, tTarget / tActual));
    const rawFinal = deltaP * bloomCoeff * timeRatio;
    const finalScore = Math.round(rawFinal * 100) / 100;

    return {
        baseDelta: deltaP,
        finalScore,
        bloomCoeff,
        timeRatio: Math.round(timeRatio * 100) / 100,
    };
}

export function calculateTMax(
    charCount: number,
    conceptCount: number,
    bloomLevel: BloomLevel,
    bufferSeconds: number = 10,
): number {
    const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[bloomLevel] || 1.0;
    const readingTimeSeconds = (charCount / 780) * 60;
    const complexitySeconds = (15 + conceptCount * 2) * difficultyMultiplier;
    const tMaxSeconds = readingTimeSeconds + complexitySeconds + bufferSeconds;

    return Math.round(tMaxSeconds * 1000);
}
