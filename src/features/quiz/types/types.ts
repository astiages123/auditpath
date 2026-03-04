import { LogCallback, Message } from '@/types/common';
import type { Json } from '@/types/database.types';

// === SECTION: Re-exports ===

export { type LogCallback, type Message };
export type { Json };

// === SECTION: AI & Provider Types ===

/** AI tarafından üretilen ham yanıt nesnesi */
export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cached_tokens?: number;
  };
}

/** Desteklenen LLM sağlayıcıları */
export type LLMProvider = 'cerebras' | 'google' | 'mimo' | 'deepseek';

// === SECTION: Analytics & Stats ===

/** Veritabanına yeni bir quiz sorusu eklemek için kullanılan nesne */
export interface QuizInsert {
  id?: string;
  course_id: string;
  chunk_id?: string | null;
  question_data: QuizQuestion;
  bloom_level?: string | null;
  concept_title?: string | null;
  created_at?: string;
}

/** Bloom taksonomisi seviyelerine göre istatistikler */
export interface BloomStats {
  level: string;
  correct: number;
  questionsSolved: number;
  score: number;
}

/** Genel quiz başarı istatistikleri */
export interface QuizStats {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  blankAnswers: number;
  averageTime: number;
  masteryScore: number;
  totalAnswered?: number; // Geriye dönük uyumluluk için
  correct?: number;
  incorrect?: number;
  blank?: number;
  remaining?: number;
  successRate?: number;
}

/** Spaced Repetition System (SRS/Aralıklı Tekrar) istatistikleri */
export interface SRSStats {
  active: number;
  reviewing: number;
  mastered: number;
  totalCards: number;
  dueCards: number;
  reviewCards: number;
  retentionRate: number;
}

// === SECTION: Concept & Mastery Domain ===

/** Konu yetkinlik detayları */
export interface SubjectCompetency {
  subject: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

/** Kavram haritası içindeki bir düğüm/kavram */
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

// === SECTION: Question Definitions ===

/** Bloom seviyeleri */
export type BloomLevel =
  | 'Bilgi'
  | 'Uygulama'
  | 'Analiz'
  | 'knowledge'
  | 'application'
  | 'analysis';

/** Quiz yanıt tipleri */
export type QuizResponseType = 'correct' | 'incorrect' | 'blank';

/** Soru format tipleri */
export type QuizQuestionType = 'multiple_choice' | 'true_false';

/** Tüm soru tipleri için ortak alanlar */
export interface BaseQuestion {
  id?: string;
  q: string; // Soru metni
  exp: string; // Açıklama
  img?: number | null; // imageUrls içindeki görsel indeksi
  imageUrls?: string[]; // Chunk ile ilişkili tüm görsel URL'leri
  imgPath?: string | null; // Geriye dönük uyumluluk için yol
  diagnosis?: string; // Yapay zeka teşhisi
  insight?: string; // Yapay zeka mentor notu
  evidence?: string; // Doğrulayıcı metin alıntısı
  chunk_id?: string;
  courseSlug?: string;
  topicSlug?: string;
}

/** Çoktan seçmeli soru tipi (Genellikle 5 seçenekli) */
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  o: string[]; // Seçenekler
  a: number; // Doğru seçeneğin indeksi
}

/** Doğru-Yanlış soru tipi */
export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  o: string[]; // ["Doğru", "Yanlış"]
  a: number; // 0 veya 1
}

/** Tüm soru tiplerini kapsayan Union tipi */
export type QuizQuestion = MultipleChoiceQuestion | TrueFalseQuestion;

/** Yapay zeka tarafından yeni üretilmiş soru nesnesi */
export interface GeneratedQuestion extends Omit<BaseQuestion, 'id'> {
  o: string[];
  a: number;
  bloomLevel: string;
  concept: string;
}

/** Quiz oturum bağlamı */
export interface SessionContext {
  userId: string;
  courseId: string;
  sessionNumber: number;
  isNewSession: boolean;
  courseName?: string;
}

/** Gelişmiş puanlama sonucu */
export interface AdvancedScoreResult {
  baseDelta: number;
  finalScore: number;
  bloomCoeff: number;
  timeRatio: number;
}

/** Quiz ana sayfasındaki ders kartları için istatistik özetleri */
export interface LandingCourseStats {
  averageMastery: number;
  lastStudyDate: string | null;
  difficultSubject: string | null;
  totalQuestions?: number;
  totalSolved?: number;
  masteredCount?: number;
  recentActivity?: {
    title: string;
    score: number;
    date: string;
  }[];
}

// === SECTION: Exam & Atlas Domain ===

/** Sınav soru dağılımı girdisi */
export interface ExamDistributionInput {
  examTotal: number;
  importance: 'high' | 'medium' | 'low';
  chunks: ChunkMetric[];
}

/** Sınav ders ağırlığı */
export interface ExamSubjectWeight {
  subject?: string;
  importance: 'high' | 'medium' | 'low';
  examTotal?: number;
}

/** Atlas/Grafik görünümü için yetkinlik düğümü */
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

/** Atlas grafik verisi ve zincir istatistikleri */
export interface MasteryChainStats {
  totalChains: number;
  resilienceBonusDays: number;
  nodes: MasteryNode[];
  edges: { source: string; target: string; isStrong: boolean }[];
}

// === SECTION: Session & History ===

/** Geçmiş quiz oturumu özeti */
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

/** Bilişsel analiz ve hata teşhisi nesnesi */
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

/** Chunk bazlı metrikler */
export interface ChunkMetric {
  id: string;
  concept_count: number;
  difficulty_index: number;
  mastery_score: number;
}

/** Durum bilgisi ile birlikte soru nesnesi */
export interface QuestionWithStatus {
  question_id: string;
  status: 'active' | 'reviewing' | 'mastered';
  next_review_session: number | null;
  questions: {
    id: string;
    chunk_id: string | null;
    course_id: string;
    parent_question_id: string | null;
    question_data: QuizQuestion;
  };
}

/** Repository'den dönen ham soru verisi */
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

/** Veritabanı user_question_status tablosu satırı */
export interface UserQuestionStatusRow {
  question_id: string;
  status: 'active' | 'reviewing' | 'mastered';
  rep_count: number;
  next_review_session: number | null;
}

/** Soru gönderim sonucu */
export interface SubmissionResult {
  isCorrect: boolean;
  scoreDelta: number;
  newMastery: number;
  newStatus: 'active' | 'reviewing' | 'mastered';
  nextReviewSession: number;
  newRepCount: number;
  progressId?: string;
}

// === SECTION: Application State Types ===

/** Quiz bileşeni içindeki UI durumu */
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

/** Test sonucu özeti */
export interface TestResultSummary {
  percentage: number;
  masteryScore: number;
  pendingReview: number;
  totalTimeFormatted: string;
}

/** Quiz sonuç sayıları */
export interface QuizResults {
  correct: number;
  incorrect: number;
  blank: number;
  totalTimeMs: number;
}

/** İnceleme kuyruğundaki soru ögesi */
export interface ReviewItem {
  questionId: string;
  status: 'active' | 'reviewing' | 'mastered';
  nextReview?: number | null;
  priority?: number;
  chunkId?: string;
  courseId?: string;
  userAnswer?: number | null;
  isCorrectAnswer?: boolean | null;
}

/** Quiz oturumunun mevcut durumu */
export type QuizSessionStatus =
  | 'IDLE'
  | 'INITIALIZING'
  | 'READY'
  | 'PLAYING'
  | 'INTERMISSION'
  | 'FINISHED'
  | 'ERROR';

/** Kullanıcının kota bilgileri */
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

/** Kursa özel istatistikler */
export type CourseStats = {
  totalQuestions?: number;
  totalQuestionsSolved?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  masteryScore?: number;
  averageMastery?: number;
} | null;

/** Quiz oturumunun genel durumu */
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

/** Oturum başlatma için payload */
export interface InitializePayload {
  sessionInfo: { currentSession: number; courseId: string };
  quotaInfo: QuotaInfo;
  courseStats: CourseStats;
  reviewQueue?: unknown[];
  batches?: unknown[][];
  totalBatches?: number;
  initialReviewIndex?: number;
}

/** Soru yanıtlama için payload */
export interface AnswerPayload {
  questionId?: string;
  answerIndex?: number;
  responseType?: string;
  selectedAnswer?: number | null;
  isCorrect: boolean;
  timeSpent?: number;
}

/** Scaffolding (ipucu/destek) ekleme için payload */
export interface ScaffoldingPayload {
  questionId: string;
  chunkId?: string;
  hint?: string;
  priority?: number;
}

/** Quiz oturumu için eylem tipleri */
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

/** Chunk bazlı yapay zeka analiz mantığı */
export interface ChunkAILogic {
  difficulty_index?: number;
  concept_map?: ConceptMapItem[];
  suggested_quotas?: {
    antrenman: number;
    deneme: number;
  };
  reasoning?: string;
  [key: string]: unknown;
}

/** Chunk meta verileri */
export interface ChunkMetadata {
  [key: string]: unknown;
}

/** Chunk ustalık tablosu satırı */
export interface ChunkMasteryRow {
  chunk_id: string;
  user_id: string;
  mastery_score: number;
  last_full_review_at: string | null;
  total_questions_seen: number;
}

/** Kota durum özeti */
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
