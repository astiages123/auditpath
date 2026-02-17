import { AIResponseMetadata, LogCallback, Message } from '@/types/common';

export { type LogCallback, type Message };

export interface ConceptMapItem {
  baslik: string;
  odak: string;
  seviye: 'Bilgi' | 'Uygulama' | 'Analiz';
  gorsel: string | null;
  altText?: string | null;
  isException?: boolean;
  prerequisites?: string[];
  [key: string]: unknown;
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
  courseSlug?: string;
  topicSlug?: string;
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

export interface QuizInsert {
  question_id: string;
  course_id: string;
  chunk_id?: string | null;
  is_correct?: boolean;
  confidence_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  answered_at?: string | null;
  response_time_ms?: number | null;
  response_type: QuizResponseType;
  session_number: number;
  ai_diagnosis?: string | null;
  ai_insight?: string | null;
}

export interface QuizStats {
  totalAnswered: number;
  correct: number;
  incorrect: number;
  blank: number;
  remaining: number;
  successRate: number;
}

export interface SubjectCompetency {
  subject: string;
  score: number; // 0-100
  totalQuestions: number;
}

export type BloomStats = {
  level: string;
  score: number;
  questionsSolved: number;
  correct?: number;
};

export interface SRSStats {
  new: number;
  learning: number;
  review: number;
  mastered: number;
}

export interface SessionResultStats {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  blankCount: number;
  timeSpentMs: number;
  courseId: string;
  userId: string;
}

export interface RecentQuizSession {
  uniqueKey: string;
  courseName: string;
  sessionNumber: number;
  date: string;
  correct: number;
  incorrect: number;
  blank: number;
  total: number;
  successRate: number;
}

export interface CognitiveInsight {
  id: string;
  courseId: string;
  questionId: string;
  diagnosis: string | null;
  insight: string | null;
  consecutiveFails: number;
  responseType: string;
  date: string;
}

export type ConceptMapResult = {
  difficulty_index: number;
  concepts: ConceptMapItem[];
};

export interface ChunkMetadata {
  difficulty_index?: number;
  concept_map?: ConceptMapItem[];
}

export interface ChunkMasteryRow {
  chunk_id: string;
  mastery_score: number;
  last_full_review_at: string | null;
  total_questions_seen: number;
}

export type QuestionUsageType = 'antrenman' | 'arsiv' | 'deneme';

export interface QuizGenerationResult {
  success: boolean;
  question?: QuizQuestion;
  error?: string;
  status?: 'generated' | 'quota_reached' | 'error';
}

export interface QuotaStatus {
  used: number;
  quota: { total: number };
  conceptCount: number;
  isFull: boolean;
  status: string; // "SYNCED" | "PROCESSING" | "COMPLETED" | "FAILED"
  difficultyIndex?: number;
}

// --- LLM Types ---

export interface AIResponse extends AIResponseMetadata {
  content: string;
}

export type LLMProvider = 'cerebras' | 'mimo' | 'google' | 'deepseek';

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
  summary: TestResultSummary | null;
  lastSubmissionResult: SubmissionResult | null;
  history: (QuizQuestion & {
    userAnswer: number | null;
    isCorrect: boolean | null;
  })[];
}

export interface TestResultSummary {
  percentage: number;
  masteryScore: number;
  pendingReview: number;
  totalTimeFormatted: string;
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
  | 'IDLE'
  | 'INITIALIZING'
  | 'READY'
  | 'PLAYING'
  | 'INTERMISSION'
  | 'FINISHED'
  | 'ERROR';

export type QuizAction =
  | {
      type: 'INITIALIZE';
      payload: {
        sessionInfo: SessionInfo;
        quotaInfo: QuotaInfo;
        reviewQueue: ReviewItem[];
        batches: ReviewItem[][];
        totalBatches: number;
        courseStats: CourseStats | null;
        initialReviewIndex?: number;
      };
    }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_STATUS'; payload: QuizStatus }
  | { type: 'START_PLAYING' }
  | {
      type: 'ANSWER_QUESTION';
      payload: {
        questionId: string;
        answerIndex: number;
        isCorrect: boolean;
        responseType: QuizResponseType;
      };
    }
  | { type: 'NEXT_QUESTION' }
  | { type: 'PREV_QUESTION' } // Optional, if we want to allow going back (view only)
  | { type: 'FINISH_BATCH' } // Triggers INTERMISSION
  | { type: 'CONTINUE_BATCH' } // Exits INTERMISSION -> PLAYING
  | { type: 'FINISH_QUIZ' }
  | { type: 'SYNC_START' }
  | { type: 'SYNC_COMPLETE' }
  | {
      type: 'INJECT_SCAFFOLDING';
      payload: { questionId: string; chunkId: string; priority: number };
    };

export interface SessionInfo {
  currentSession: number;
  totalSessions: number;
  courseId: string;
}

export interface QuizSessionState {
  status: QuizStatus;
  sessionInfo: SessionInfo | null;
  quotaInfo: QuotaInfo | null;
  reviewQueue: ReviewItem[];
  batches: ReviewItem[][];
  currentBatchIndex: number;
  totalBatches: number;
  currentReviewIndex: number;
  courseStats: CourseStats | null;
  error: string | null;
  isSyncing: boolean;

  // SSoT fields
  currentQuestion: QuizQuestion | null; // Currently active question to display
  results: QuizResults;
  isAnswered: boolean;
  selectedAnswer: number | null;
  isCorrect: boolean | null; // For immediate feedback
  startTime: number | null; // For timing
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
  bloomLevel: 'knowledge' | 'application' | 'analysis';
  concept: string;
}

export interface SubmissionResult {
  isCorrect: boolean;
  scoreDelta: number;
  newMastery: number;
  newStatus: 'active' | 'pending_followup' | 'archived';
  isTopicRefreshed: boolean;
  nextReviewSession: number | null;
  newSuccessCount: number;
  newFailsCount: number;
}
