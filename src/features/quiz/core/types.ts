import { AIResponseMetadata, LogCallback, Message } from '@/shared/types/core';
import {
  ConceptMapItem,
  ConceptMapResult,
  QuizQuestion,
  QuizResponseType,
} from '@/shared/types/quiz';

export {
  type ConceptMapItem,
  type ConceptMapResult,
  type QuizQuestion,
  type QuizResponseType,
};

export interface ChunkMetadata {
  difficulty_index?: number;
  density_score?: number;
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
  wordCount: number;
  conceptCount: number;
  isFull: boolean;
  status: string; // "SYNCED" | "PROCESSING" | "COMPLETED" | "FAILED"
  difficultyIndex?: number;
  meaningfulWordCount?: number;
}

// --- LLM Types ---

export type { LogCallback, Message };

export interface AIResponse extends AIResponseMetadata {
  content: string;
}

export type LLMProvider = 'cerebras' | 'mimo' | 'google';

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
  | 'IDLE'
  | 'LOADING'
  | 'READY'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'ERROR';

export interface SolveQuizCallbacks {
  onStateChange?: (state: QuizState) => void;
  onResultsUpdate?: (results: QuizResults) => void;
  onComplete?: (results: QuizResults) => void;
  onLog?: (message: string, details?: Record<string, unknown>) => void;
  onError?: (error: string) => void;
  /** Callback to record response to DB/Context */
  recordResponse?: (
    questionId: string,
    responseType: QuizResponseType,
    selectedAnswer: number | null,
    timeSpentMs: number,
    diagnosis?: string,
    insight?: string,
    evidence?: string
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
