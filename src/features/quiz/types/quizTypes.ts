import { AIResponseMetadata, LogCallback, Message } from "@/types";
import { ConceptMapItem, QuizQuestion, QuizResponseType } from "@/types";

export { type ConceptMapItem, type QuizQuestion, type QuizResponseType };

export type ConceptMapResult = {
  difficulty_index: number;
  concepts: ConceptMapItem[];
  quotas: {
    antrenman: number;
    arsiv: number;
    deneme: number;
  };
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
  conceptCount: number;
  isFull: boolean;
  status: string; // "SYNCED" | "PROCESSING" | "COMPLETED" | "FAILED"
  difficultyIndex?: number;
}

// --- LLM Types ---

export type { LogCallback, Message };

export interface AIResponse extends AIResponseMetadata {
  content: string;
}

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
  summary: TestResultSummary | null;
  lastSubmissionResult: SubmissionResult | null;
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
  | "IDLE"
  | "INITIALIZING"
  | "READY"
  | "PLAYING"
  | "INTERMISSION"
  | "FINISHED"
  | "ERROR";

export type QuizAction =
  | {
    type: "INITIALIZE";
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
  | { type: "SET_ERROR"; payload: string }
  | { type: "START_PLAYING" }
  | {
    type: "ANSWER_QUESTION";
    payload: { questionId: string; answerIndex: number; isCorrect: boolean };
  }
  | { type: "NEXT_QUESTION" }
  | { type: "PREV_QUESTION" } // Optional, if we want to allow going back (view only)
  | { type: "FINISH_BATCH" } // Triggers INTERMISSION
  | { type: "CONTINUE_BATCH" } // Exits INTERMISSION -> PLAYING
  | { type: "FINISH_QUIZ" }
  | { type: "SYNC_START" }
  | { type: "SYNC_COMPLETE" }
  | {
    type: "INJECT_SCAFFOLDING";
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
  bloomLevel: "knowledge" | "application" | "analysis";
  concept: string;
}

export interface SubmissionResult {
  isCorrect: boolean;
  scoreDelta: number;
  newMastery: number;
  newStatus: "active" | "pending_followup" | "archived";
  isTopicRefreshed: boolean;
  nextReviewSession: number | null;
  newSuccessCount: number;
  newFailsCount: number;
}
