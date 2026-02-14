/**
 * Quiz Engine Intelligence Layer - Consolidated Logic
 *
 * This file contains all mathematical, rule-based, and scoring logic for the quiz feature.
 * It is designed to be pure and independent of database side effects.
 */

import type { Database } from "@/types/database.types";
import {
    type ChunkMetadata,
    type ConceptMapItem,
    type QuizResponseType,
    type QuizResults,
    type SubmissionResult,
    type TestResultSummary,
} from "./types";

// --- Types & Constants ---

export type BloomLevel = Database["public"]["Enums"]["bloom_level"];

export interface ExamSubjectWeight {
    subject?: string;
    importance: "high" | "medium" | "low";
    examTotal?: number;
}

export interface ChunkMetric {
    id: string;
    concept_count: number;
    difficulty_index: number;
    mastery_score: number;
}

export interface ExamDistributionInput {
    examTotal: number;
    importance: ExamSubjectWeight["importance"];
    chunks: ChunkMetric[];
}

export interface ScoreChange {
    delta: number;
    newScore: number;
}

export interface AdvancedScoreResult {
    baseDelta: number;
    finalScore: number;
    bloomCoeff: number;
    timeRatio: number;
}

export type CourseCategory = "SKILL_BASED" | "SCENARIO_BASED" | "THEORY_BASED";

export interface BloomStrategy {
    bloomLevel: "knowledge" | "application" | "analysis";
    baseInstruction: string;
}

const POINTS_CORRECT = 10;
const PENALTY_INCORRECT_FIRST = 5;
const PENALTY_BLANK_FIRST = 2;
const PENALTY_REPEATED = 10;
const SESSION_GAPS = [1, 2, 5, 10, 20];
const SLOW_SUCCESS_INCREMENT = 0.5;

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

export const EXAM_STRATEGY: Record<string, ExamSubjectWeight> = {
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

const CATEGORY_MAPPINGS: Record<string, CourseCategory> = {
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

const DEFAULT_CATEGORY: CourseCategory = "THEORY_BASED";

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

export const BLOOM_INSTRUCTIONS = {
    knowledge:
        "Temel bilgi ve kavrama düzeyinde, akademik bir dille hazırlanmış öğretici bir soru üret. Tanım, ilke veya kavramsal özelliklere odaklan.",
    application:
        "Kuru tanım sorma. Kullanıcının günlük hayatta karşılaşabileceği, isimler ve olaylar içeren spesifik bir 'vaka/senaryo' (vignette) kurgula.",
    analysis:
        "Metindeki iki farklı kavramı karşılaştıran veya bir kuralın istisnasını sorgulayan 'muhakeme' odaklı bir soru üret. Soru, 'X olursa Y nasıl etkilenir?' gibi neden-sonuç zinciri kurdurmalıdır.",
};

// --- Exam Logic (formerly exam.ts) ---

/**
 * Calculates the number of questions to generate for each chunk.
 */
export function calculateQuestionWeights(
    input: ExamDistributionInput,
): Map<string, number> {
    const { examTotal, importance, chunks } = input;

    if (chunks.length === 0) {
        return new Map();
    }

    const importanceScore = importance === "high"
        ? 1.0
        : importance === "medium"
        ? 0.7
        : 0.4;

    const maxConceptCount = Math.max(...chunks.map((c) => c.concept_count), 1);

    const chunkWeights = chunks.map((chunk) => {
        const normalizedMastery = Math.min(
            Math.max(chunk.mastery_score / 100, 0),
            1,
        );
        const masteryFactor = 1.0 - normalizedMastery;
        const lengthFactor = chunk.concept_count / maxConceptCount;
        const difficulty = chunk.difficulty_index || 3;
        const densityFactor = (difficulty - 1) / 4;

        const weight = importanceScore * 0.4 +
            masteryFactor * 0.3 +
            densityFactor * 0.2 +
            lengthFactor * 0.1;

        return {
            id: chunk.id,
            weight,
            original: chunk,
        };
    });

    const totalWeight = chunkWeights.reduce((sum, c) => sum + c.weight, 0);
    const result = new Map<string, number>();

    if (totalWeight === 0) {
        const baseCount = Math.floor(examTotal / chunks.length);
        let remainder = examTotal % chunks.length;
        chunks.forEach((c) => {
            result.set(c.id, baseCount + (remainder > 0 ? 1 : 0));
            remainder--;
        });
        return result;
    }

    let currentTotal = 0;
    const allocations = chunkWeights.map((c) => {
        const exactShare = (c.weight / totalWeight) * examTotal;
        const floorShare = Math.floor(exactShare);
        const remainder = exactShare - floorShare;
        return {
            id: c.id,
            count: floorShare,
            remainder,
        };
    });

    allocations.forEach((a) => (currentTotal += a.count));

    const remainingQuestions = examTotal - currentTotal;
    allocations.sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < remainingQuestions; i++) {
        allocations[i].count += 1;
    }

    allocations.forEach((a) => {
        result.set(a.id, a.count);
    });

    return result;
}

// --- Scoring Logic (formerly scoring.ts) ---

export function calculateInitialResults(): QuizResults {
    return {
        correct: 0,
        incorrect: 0,
        blank: 0,
        totalTimeMs: 0,
    };
}

export function updateResults(
    currentResults: QuizResults,
    type: "correct" | "incorrect" | "blank",
    timeMs: number,
): QuizResults {
    return {
        ...currentResults,
        [type]: currentResults[type] + 1,
        totalTimeMs: currentResults.totalTimeMs + timeMs,
    };
}

export function calculateMastery(results: QuizResults, total: number): number {
    if (total === 0) return 0;
    return Math.round((results.correct / total) * 100);
}

export function isExcellenceAchieved(
    results: QuizResults,
    total: number,
): boolean {
    const mastery = calculateMastery(results, total);
    return mastery >= 80;
}

export function calculateTestResults(
    correct: number,
    incorrect: number,
    blank: number,
    timeSpentMs: number,
): TestResultSummary {
    const total = correct + incorrect + blank;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const masteryScore = total > 0
        ? Math.round(
            ((correct * 1.0 + incorrect * 0.2 + blank * 0.0) / total) * 100,
        )
        : 0;
    const pendingReview = incorrect + blank;
    const seconds = Math.floor(timeSpentMs / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const h = Math.floor(m / 60);
    const mRemaining = m % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const totalTimeFormatted = `${pad(h)}:${pad(mRemaining)}:${pad(s)}`;

    return {
        percentage,
        masteryScore,
        pendingReview,
        totalTimeFormatted,
    };
}

export function calculateChunkMastery(
    totalQuestions: number,
    uniqueSolved: number,
    averageScore: number,
): number {
    if (totalQuestions === 0) return 0;
    const coverageRatio = Math.min(1, uniqueSolved / totalQuestions);
    const coverageScore = coverageRatio * 60;
    const scoreComponent = averageScore * 0.4;
    return Math.round(coverageScore + scoreComponent);
}

// --- SRS Logic (formerly srs.ts) ---

export function calculateShelfStatus(
    consecutiveSuccess: number,
    isCorrect: boolean,
    isFast: boolean,
): {
    newStatus: "archived" | "pending_followup" | "active";
    newSuccessCount: number;
} {
    if (!isCorrect) {
        const newSuccessCount = 0;
        return { newStatus: "pending_followup", newSuccessCount };
    }

    const increment = isFast ? 1.0 : SLOW_SUCCESS_INCREMENT;
    const newSuccessCount = consecutiveSuccess + increment;

    if (newSuccessCount >= 3) {
        return { newStatus: "archived", newSuccessCount };
    } else if (newSuccessCount >= 0.5) {
        return { newStatus: "pending_followup", newSuccessCount };
    }

    return { newStatus: "active", newSuccessCount };
}

export function calculateNextReviewSession(
    currentSession: number,
    successCount: number,
): number {
    const adjustedSuccessCount = Math.max(1, successCount);
    const gapIndex = Math.floor(adjustedSuccessCount) - 1;
    const safeIndex = Math.max(0, Math.min(gapIndex, SESSION_GAPS.length - 1));
    const gap = SESSION_GAPS[safeIndex];
    return currentSession + gap;
}

export function calculateScoreChange(
    responseType: QuizResponseType,
    currentScore: number,
    isRepeated: boolean = false,
): ScoreChange {
    let delta = 0;

    if (responseType === "correct") {
        delta = POINTS_CORRECT;
    } else {
        if (isRepeated) {
            delta = -PENALTY_REPEATED;
        } else {
            if (responseType === "incorrect") {
                delta = -PENALTY_INCORRECT_FIRST;
            } else if (responseType === "blank") {
                delta = -PENALTY_BLANK_FIRST;
            }
        }
    }

    const newScore = Math.max(0, Math.min(100, currentScore + delta));

    return {
        delta,
        newScore,
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

// --- Strategy Logic (formerly strategy.ts) ---

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

// --- Submission Logic (formerly submission-calculator.ts) ---

export function calculateQuizResult(
    currentStatus: {
        consecutive_success: number;
        consecutive_fails: number;
    } | null,
    responseType: QuizResponseType,
    timeSpentMs: number,
    questionData: {
        bloom_level: string | null;
        chunk_id: string | null;
    } | null,
    chunkMetadata: {
        content: string | null;
        metadata: ChunkMetadata | null;
    } | null,
    masteryData: {
        mastery_score: number;
    } | null,
    uniqueSolvedCount: number,
    totalChunkQuestions: number,
    sessionNumber: number,
): SubmissionResult {
    const isCorrect = responseType === "correct";
    const isRepeated = (currentStatus?.consecutive_fails || 0) > 0 ||
        (currentStatus?.consecutive_success || 0) > 0;

    let isFast = timeSpentMs < 30000;
    if (questionData && chunkMetadata) {
        const contentLength = chunkMetadata.content?.length || 0;
        const metadata = chunkMetadata.metadata || {};
        const conceptCount = metadata.concept_map?.length || 5;

        const bloomLevel = (questionData.bloom_level as BloomLevel) ||
            "knowledge";
        const tMaxMs = calculateTMax(contentLength, conceptCount, bloomLevel);

        isFast = timeSpentMs <= tMaxMs;
    }

    const srsResult = calculateShelfStatus(
        currentStatus?.consecutive_success || 0,
        isCorrect,
        isFast,
    );

    const nextReviewSession = srsResult.newStatus === "pending_followup" ||
            srsResult.newStatus === "archived"
        ? calculateNextReviewSession(sessionNumber, srsResult.newSuccessCount)
        : null;

    const previousMastery = masteryData?.mastery_score || 0;
    const scoreChange = calculateScoreChange(
        responseType,
        previousMastery,
        isRepeated,
    );
    const scoreDelta = scoreChange.delta;

    const coverageRatio = totalChunkQuestions > 0
        ? Math.min(1, uniqueSolvedCount / totalChunkQuestions)
        : 0;
    const coverageScore = coverageRatio * 60;
    const newMastery = Math.round(coverageScore + scoreChange.newScore * 0.4);

    const isTopicRefreshed = totalChunkQuestions > 0 &&
        uniqueSolvedCount / totalChunkQuestions >= 0.8;

    const newFailsCount = isCorrect
        ? 0
        : (currentStatus?.consecutive_fails || 0) + 1;

    return {
        isCorrect,
        scoreDelta,
        newMastery,
        newStatus: srsResult.newStatus,
        nextReviewSession,
        isTopicRefreshed,
        newSuccessCount: srsResult.newSuccessCount,
        newFailsCount,
    };
}
