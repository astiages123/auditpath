import { LogCallback, Message } from '@/types/common';
import type { Json } from '@/types/database.types';

export { type LogCallback, type Message };
export type { Json };

// AI Response types
export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cached_tokens?: number;
  };
}

export type LLMProvider = 'cerebras' | 'google' | 'mimo' | 'deepseek';

// Quiz analytics types
export interface QuizInsert {
  id?: string;
  course_id: string;
  chunk_id?: string | null;
  question_data: QuizQuestion;
  bloom_level?: string | null;
  concept_title?: string | null;
  created_at?: string;
}

export interface BloomStats {
  level: string;
  correct: number;
  questionsSolved: number;
  score: number;
}

export interface QuizStats {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  blankAnswers: number;
  averageTime: number;
  masteryScore: number;
  totalAnswered?: number; // For backwards compatibility
  correct?: number;
  incorrect?: number;
  blank?: number;
  remaining?: number;
  successRate?: number;
}

export interface SRSStats {
  totalCards: number;
  dueCards: number;
  newCards: number;
  reviewCards: number;
  retentionRate: number;
  // Legacy fields for backwards compatibility
  new?: number;
  learning?: number;
  review?: number;
  mastered?: number;
}

export interface SubjectCompetency {
  subject: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

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

export interface GeneratedQuestion extends Omit<BaseQuestion, 'id'> {
  o: string[];
  a: number;
  bloomLevel: string;
  concept: string;
}

export interface SessionContext {
  userId: string;
  courseId: string;
  sessionNumber: number;
  isNewSession: boolean;
  courseName?: string;
}

export interface AdvancedScoreResult {
  baseDelta: number;
  finalScore: number;
  bloomCoeff: number;
  timeRatio: number;
}

export interface ExamDistributionInput {
  examTotal: number;
  importance: 'high' | 'medium' | 'low';
  chunks: ChunkMetric[];
}

export interface ExamSubjectWeight {
  subject?: string;
  importance: 'high' | 'medium' | 'low';
  examTotal?: number;
}

export interface MasteryNode {
  id: string;
  label: string;
  mastery: number;
  status: 'mastered' | 'in-progress' | 'weak';
  prerequisites: string[];
  isChainComplete: boolean;
  depth: number;
  data: {
    focus: string;
    aiInsight?: string;
  };
}

export interface MasteryChainStats {
  totalChains: number;
  resilienceBonusDays: number;
  nodes: MasteryNode[];
  edges: { source: string; target: string; isStrong: boolean }[];
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
  responseType: string | null;
  date: string;
}

export interface ChunkMetric {
  id: string;
  concept_count: number;
  difficulty_index: number;
  mastery_score: number;
}

export interface QuestionWithStatus {
  question_id: string;
  status: 'active' | 'pending_followup' | 'archived' | 'learning';
  next_review_session: number | null;
  questions: {
    id: string;
    chunk_id: string | null;
    course_id: string;
    parent_question_id: string | null;
    question_data: QuizQuestion;
  };
}

export interface RepositoryQuestion {
  id: string;
  chunk_id: string | null;
  question_data: QuizQuestion | Json;
  bloom_level: string | null;
  concept_title: string | null;
  usage_type: string | null;
  course?: { course_slug: string } | null;
  chunk?: { section_title: string } | null;
}

export interface UserQuestionStatusRow {
  question_id: string;
  status: 'active' | 'pending_followup' | 'archived' | 'learning';
  consecutive_success: number;
  consecutive_fails: number;
  next_review_session: number | null;
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

export interface ReviewItem {
  questionId: string;
  status: 'active' | 'pending_followup' | 'archived';
  nextReview?: number | null;
  priority?: number;
  chunkId?: string;
  courseId?: string;
  userAnswer?: number | null;
  isCorrectAnswer?: boolean | null;
}

export type QuizSessionStatus =
  | 'IDLE'
  | 'INITIALIZING'
  | 'READY'
  | 'PLAYING'
  | 'INTERMISSION'
  | 'FINISHED'
  | 'ERROR';

export type QuotaInfo = {
  dailyLimit?: number;
  dailyQuota?: number;
  remaining?: number;
  remainingReview?: number;
  used: number;
  pendingReviewCount?: number;
  reviewQuota?: number;
  isMaintenanceMode?: boolean;
} | null;

export type CourseStats = {
  totalQuestions?: number;
  totalQuestionsSolved?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  masteryScore?: number;
  averageMastery?: number;
} | null;

export interface QuizSessionState {
  status: QuizSessionStatus;
  sessionInfo: { currentSession: number; courseId: string } | null;
  quotaInfo: QuotaInfo | null;
  reviewQueue: ReviewItem[];
  batches: ReviewItem[][];
  currentBatchIndex: number;
  totalBatches: number;
  currentReviewIndex: number;
  courseStats: CourseStats | null;
  error: string | null;
  isSyncing: boolean;
  currentQuestion: QuizQuestion | null;
  results: QuizResults;
  isAnswered: boolean;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  startTime: number | null;
}

export interface InitializePayload {
  sessionInfo: { currentSession: number; courseId: string };
  quotaInfo: QuotaInfo;
  courseStats: CourseStats;
  reviewQueue?: unknown[];
  batches?: unknown[][];
  totalBatches?: number;
  initialReviewIndex?: number;
}

export interface AnswerPayload {
  questionId?: string;
  answerIndex?: number;
  responseType?: string;
  selectedAnswer?: number | null;
  isCorrect: boolean;
  timeSpent?: number;
}

export interface ScaffoldingPayload {
  questionId: string;
  chunkId?: string;
  hint?: string;
  priority?: number;
}

export type QuizAction =
  | { type: 'INITIALIZE'; payload: InitializePayload }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_STATUS'; payload: QuizSessionStatus }
  | { type: 'START_PLAYING' }
  | { type: 'ANSWER_QUESTION'; payload: AnswerPayload }
  | { type: 'SYNC_START' }
  | { type: 'SYNC_COMPLETE' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'FINISH_BATCH' }
  | { type: 'CONTINUE_BATCH' }
  | { type: 'INJECT_SCAFFOLDING'; payload: ScaffoldingPayload }
  | { type: 'FINISH_QUIZ' }
  | { type: 'PREV_QUESTION' };

export interface ChunkAILogic {
  difficulty_index?: number;
  concept_map?: ConceptMapItem[];
  suggested_quotas?: {
    antrenman: number;
    arsiv: number;
    deneme: number;
  };
  reasoning?: string;
  [key: string]: unknown;
}

export interface ChunkMetadata {
  [key: string]: unknown;
}

export interface ChunkMasteryRow {
  chunk_id: string;
  user_id: string;
  mastery_score: number;
  last_full_review_at: string | null;
  streak: number;
  total_questions_seen: number;
}

export interface QuotaStatus {
  used: number;
  quota: {
    total: number;
  };
  isFull: boolean;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  conceptCount: number;
}

// Note: GenerationStep, GenerationLog, GeneratorCallbacks, and ValidationResult
// are defined in schemas.ts to avoid duplication
