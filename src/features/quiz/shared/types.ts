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
}

export type QuestionUsageType = "antrenman" | "arsiv" | "deneme";

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
}
