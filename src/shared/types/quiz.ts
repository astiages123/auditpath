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

export type QuizResponseType = "correct" | "incorrect" | "blank";

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
