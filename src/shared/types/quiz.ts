export interface ConceptMapItem {
  baslik: string;
  odak: string;
  seviye: 'Bilgi' | 'Uygulama' | 'Analiz';
  gorsel: string | null;
  altText?: string | null;
  isException?: boolean;
  prerequisites?: string[];
  [key: string]: any; // To satisfy Supabase Json type requirements while staying flexible
}

export interface ConceptMapResult {
  difficulty_index: number;
  concepts: ConceptMapItem[];
}

export type QuizResponseType = 'correct' | 'incorrect' | 'blank';

export type QuizQuestionType = 'multiple_choice' | 'true_false';

export interface BaseQuestion {
  id?: string;
  q: string; // Question text
  exp: string; // Explanation
  img?: number | null; // Index of the image in imageUrls array
  imageUrls?: string[]; // Array of image URLs for the chunk
  imgPath?: string | null; // Legacy/Optional path override
  diagnosis?: string;
  insight?: string;
  evidence?: string;
  chunk_id?: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  o: string[]; // Typically 5 options
  a: number; // Correct index
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  o: string[]; // ["Doğru", "Yanlış"]
  a: number; // 0 or 1
}

export type QuizQuestion = MultipleChoiceQuestion | TrueFalseQuestion;
