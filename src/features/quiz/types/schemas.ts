import { z } from 'zod';

/**
 * Validation schemas for Quiz domain types
 *
 * These schemas provide runtime type safety for data coming from:
 * - Supabase JSON columns (question_data, metadata)
 * - External APIs
 * - Local storage
 */

// ============================================================================
// Concept Map Schemas
// ============================================================================

export const ConceptMapItemSchema = z.object({
  baslik: z.string(),
  odak: z.string(),
  seviye: z.enum(['Bilgi', 'Uygulama', 'Analiz']),
  gorsel: z.string().nullable(),
  altText: z.string().nullable().optional(),
  isException: z.boolean().optional(),
  prerequisites: z.array(z.string()).optional(),
});

export type ValidatedConceptMapItem = z.infer<typeof ConceptMapItemSchema>;

// ============================================================================
// Quiz Question Schemas
// ============================================================================

export const BaseQuestionSchema = z.object({
  id: z.string().optional(),
  q: z.string(),
  exp: z.string(),
  img: z.number().nullable().optional(),
  imageUrls: z.array(z.string()).optional(),
  imgPath: z.string().nullable().optional(),
  diagnosis: z.string().optional(),
  insight: z.string().optional(),
  evidence: z.string().optional(),
  chunk_id: z.string().optional(),
  courseSlug: z.string().optional(),
  topicSlug: z.string().optional(),
});

export const MultipleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('multiple_choice'),
  o: z.array(z.string()),
  a: z.number(),
});

export const TrueFalseQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('true_false'),
  o: z.tuple([z.string(), z.string()]).or(z.array(z.string()).length(2)),
  a: z.number().min(0).max(1),
});

export const QuizQuestionSchema = z.discriminatedUnion('type', [
  MultipleChoiceQuestionSchema,
  TrueFalseQuestionSchema,
]);

export type ValidatedQuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuestionStatusSchema = z.enum([
  'active',
  'pending_followup',
  'archived',
  'learning',
]);

// ============================================================================
// Chunk Metadata Schemas
// ============================================================================

export const ChunkMetadataSchema = z.object({
  difficulty_index: z.number().optional(),
  concept_map: z.array(ConceptMapItemSchema).optional(),
});

export type ValidatedChunkMetadata = z.infer<typeof ChunkMetadataSchema>;

// ============================================================================
// Repository Row Schemas
// ============================================================================

export const QuestionRowSchema = z.object({
  id: z.string(),
  chunk_id: z.string().nullable(),
  course_id: z.string(),
  parent_question_id: z.string().nullable(),
  question_data: z.unknown(),
});

export const QuestionWithStatusRowSchema = z.object({
  question_id: z.string(),
  status: QuestionStatusSchema,
  next_review_session: z.number().nullable(),
  questions: QuestionRowSchema.pick({
    id: true,
    chunk_id: true,
    course_id: true,
    parent_question_id: true,
    question_data: true,
  }),
});

export const FollowUpQuestionRowSchema = z.object({
  id: z.string(),
  chunk_id: z.string().nullable(),
  course_id: z.string(),
  parent_question_id: z.string().nullable(),
  question_data: z.unknown(),
  user_question_status: z.array(z.object({ status: z.string() })),
});

export type ValidatedFollowUpQuestion = z.infer<
  typeof FollowUpQuestionRowSchema
>;

// ============================================================================
// Exchange Rate Schema
// ============================================================================

export const ExchangeRateSchema = z.object({
  TRY: z.number(),
  EUR: z.number().optional(),
  GBP: z.number().optional(),
});

export type ValidatedExchangeRate = z.infer<typeof ExchangeRateSchema>;

// ============================================================================
// Note Chunk Schemas
// ============================================================================

export const ChunkWithContentSchema = z.object({
  id: z.string(),
  course_id: z.string(),
  metadata: z.unknown(),
  status: z.string(),
  content: z.string(),
  display_content: z.string().nullable(),
  course_name: z.string().nullable(),
  section_title: z.string().nullable(),
  ai_logic: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// Pomodoro Timeline Schemas
// ============================================================================

// Timeline schemas removed - no longer needed

// ============================================================================
// Quiz Engine Schemas
// ============================================================================

export const ConceptMapSchema = z.preprocess(
  (val: unknown) => {
    const item = val as Record<string, unknown>;
    if (item && typeof item === 'object' && !item.baslik) {
      item.baslik = item.title || item.kavram || item.başlık || item.topic;
    }
    return item;
  },
  z.object({
    baslik: z.string().min(1),
    odak: z.string().default('Konu kapsamındaki temel kazanım'),
    // seviye alanına preprocess ekleyip metin bazında seviye belirleme
    seviye: z.preprocess(
      (val) => {
        const s = String(val).toLowerCase();
        if (s.includes('uygulama') || s.includes('apply')) {
          return 'Uygulama';
        }
        if (s.includes('analiz') || s.includes('analyze')) return 'Analiz';
        return 'Bilgi';
      },
      z.enum(['Bilgi', 'Uygulama', 'Analiz'])
    ),
    // gorsel alanı boş string gelirse null'a çevir
    gorsel: z.preprocess(
      (val) => (val === '' || val === undefined ? null : val),
      z.string().nullable()
    ),
    altText: z.string().nullable().optional().default(null),
    isException: z.preprocess((val) => !!val, z.boolean().default(false)),
    prerequisites: z.array(z.string()).optional().default([]),
  })
);

export const ConceptMapResponseSchema = z.object({
  difficulty_index: z.preprocess((val) => {
    const num = Number(val);
    return Math.max(1, Math.min(5, isNaN(num) ? 3 : num));
  }, z.number().min(1).max(5).describe('Metnin bilişsel zorluk endeksi (1: Basit, 5: Çok Ağır Doktrin)')),
  concepts: z.array(ConceptMapSchema).nonempty(),
});

export const GeneratedQuestionSchema = z.object({
  q: z.string().min(10, 'Soru metni çok kısa'),
  o: z.array(z.string()).length(5, 'Tam olarak 5 seçenek olmalı'),
  a: z.number().int().min(0).max(4),
  exp: z.string().min(10, 'Açıklama metni çok kısa'),
  evidence: z.string().min(1, 'Kanıt cümlesi zorunludur'),
  img: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'null') return null;
      const n = parseInt(val, 10);
      return isNaN(n) ? null : n;
    }
    return val;
  }, z.number().nullable().optional()),
  diagnosis: z.string().max(500).optional(),
  insight: z.string().max(500).nullable().optional(),
});

export const ValidationResultSchema = z.preprocess(
  (data: unknown) => {
    const item = data as Record<string, unknown>;
    if (item && typeof item === 'object') {
      // total_score alanı yoksa alternatif isimlere bak
      if (item.total_score === undefined) {
        item.total_score = item.score ?? item.puan ?? item.point;
      }
      // decision alanı metnine göre eşle
      if (item.decision && typeof item.decision === 'string') {
        const d = item.decision.toUpperCase();
        if (
          d.includes('APPROV') ||
          d.includes('ONAY') ||
          d.includes('KABUL') ||
          d.includes('OK') ||
          d.includes('TRUE')
        ) {
          item.decision = 'APPROVED';
        } else if (
          d.includes('RED') ||
          d.includes('REJECT') ||
          d.includes('HATA')
        ) {
          item.decision = 'REJECTED';
        }
      }
    }
    return item;
  },
  z.object({
    total_score: z.coerce.number().min(0).max(100),
    decision: z.enum(['APPROVED', 'REJECTED']),
    critical_faults: z.array(z.string()).default([]),
    improvement_suggestion: z.string().default(''),
  })
);

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export type GenerationStep =
  | 'INIT'
  | 'MAPPING'
  | 'GENERATING'
  | 'VALIDATING'
  | 'REVISION'
  | 'SAVING'
  | 'COMPLETED'
  | 'ERROR';

export interface GenerationLog {
  id: string;
  step: GenerationStep;
  message: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface GeneratorCallbacks {
  onLog: (log: GenerationLog) => void;
  onTotalTargetCalculated: (target: number) => void;
  onQuestionSaved: (totalSaved: number) => void;
  onComplete: (result: { success: boolean; generated: number }) => void;
  onError: (error: string) => void;
}
