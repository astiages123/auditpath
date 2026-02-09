// --- Shared Quiz Types ---

export interface QuizQuestion {
    q: string; // Question text
    o: string[]; // 5 options
    a: number; // Correct index
    exp: string; // Explanation
    img?: number | null; // Index of the image in imageUrls array
    imageUrls?: string[]; // Array of image URLs for the chunk
    imgPath?: string | null; // Legacy/Optional path override
    id?: string;
    diagnosis?: string;
    insight?: string;
    evidence?: string;
    chunk_id?: string;
}

export interface ChunkMasteryRow {
    chunk_id: string;
    mastery_score: number;
    last_full_review_at: string | null;
    total_questions_seen: number;
}

export type QuestionUsageType = "antrenman" | "arsiv" | "deneme";

export type QuizResponseType = "correct" | "incorrect" | "blank";

export interface QuizGenerationResult {
    success: boolean;
    question?: QuizQuestion;
    error?: string;
    status?: "generated" | "quota_reached" | "error";
}

export interface QuotaStatus {
    used: number;
    quota: { total: number };
    wordCount: number;
    conceptCount: number;
    isFull: boolean;
    status: string; // "SYNCED" | "PROCESSING" | "COMPLETED" | "FAILED"
    difficultyIndex?: number;
    meaningfulWordCount?: number;
}

// --- LLM Types ---

export interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface AIResponse {
    content: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        cached_tokens: number;
    };
}

export type LogCallback = (
    message: string,
    details?: Record<string, unknown>,
) => void;

export type LLMProvider = "cerebras" | "mimo" | "google";

// --- Knowledge Types ---

/**
 * Subject Knowledge Module Interface
 * Each Banka/İdari subject exports a constant conforming to this interface.
 */
export interface SubjectKnowledge {
    /** Unique identifier in snake_case (e.g., "ceza_hukuku") */
    id: string;
    /** "Anayasa" - Core rules and constraints for question generation */
    constitution: string;
    /** "Altın Örnek" - Example question with full feedback architecture */
    fewShot: string;
}

// --- Quiz State & Results Types ---

export interface QuizState {
    currentQuestion: QuizQuestion | null;
    queue: QuizQuestion[];
    totalToGenerate: number;
    generatedCount: number;
    isLoading: boolean;
    error: string | null;
    selectedAnswer: number | null;
    isAnswered: boolean;
    showExplanation: boolean;
    isCorrect: boolean | null;
    hasStarted: boolean;
}

export interface QuizResults {
    correct: number;
    incorrect: number;
    blank: number;
    totalTimeMs: number;
}

export interface QuizProgressDetails {
    totalQuestions: number;
    currentQuestionIndex: number;
    remainingInQueue: number;
}

export type QuizStatus =
    | "IDLE"
    | "LOADING"
    | "READY"
    | "IN_PROGRESS"
    | "FINISHED"
    | "ERROR";

export interface SolveQuizCallbacks {
    onStateChange?: (state: QuizState) => void;
    onResultsUpdate?: (results: QuizResults) => void;
    onComplete?: (results: QuizResults) => void;
    onLog?: (message: string, details?: Record<string, unknown>) => void;
    onError?: (error: string) => void;
    /** Callback to record response to DB/Context */
    recordResponse?: (
        questionId: string,
        responseType: "correct" | "incorrect" | "blank",
        selectedAnswer: number | null,
        timeSpentMs: number,
        diagnosis?: string,
        insight?: string,
        evidence?: string,
    ) => Promise<void>;
}

export interface SessionInfo {
    currentSession: number;
    totalSessions: number;
    courseId: string;
}

export interface QuotaInfo {
    dailyQuota: number;
    used: number;
    pendingReviewCount: number;
    isMaintenanceMode: boolean;
    reviewQuota: number;
}

export interface ReviewItem {
    questionId: string;
    status: string;
    nextReview?: number | null;
    priority?: number;
    chunkId?: string;
    courseId?: string;
}

export interface CourseStats {
    totalQuestionsSolved: number;
    averageMastery: number;
}

// --- Strategy & Concept Types ---

export interface ConceptMapItem {
    baslik: string;
    odak: string;
    seviye: "Bilgi" | "Uygulama" | "Analiz";
    gorsel: string | null;
    altText?: string | null;
    isException?: boolean;
    prerequisites?: string[];
}

export interface ConceptMapResult {
    difficulty_index: number;
    concepts: ConceptMapItem[];
}

// --- Generator Types ---

export interface GeneratedQuestion {
    q: string;
    o: string[];
    a: number;
    exp: string;
    evidence: string;
    img?: number | null;
    diagnosis?: string;
    insight?: string | null;
    bloomLevel: "knowledge" | "application" | "analysis";
    concept: string;
}
